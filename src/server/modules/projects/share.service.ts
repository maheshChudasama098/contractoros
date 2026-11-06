import "server-only";
import { Op, type Model } from "sequelize";
import { Customer, CustomerPortalEvent, CustomerPortalLink, Organization, OrganizationMembership, Project, ProjectEvent, ProjectTask, Property, User, sequelize } from "@server/core/db/models";
import { prisma } from "@server/core/db/prisma";
import { randomToken, sha256 } from "@server/core/auth/crypto";
import { env } from "@server/core/config/env";
import { getRequestContext } from "@server/core/context/request-context";
import { Errors } from "@server/core/http/errors";
import type { TenantContext } from "@server/core/tenancy/context";
import type { NewShareLink, ShareLinkDto, SharedProject, SharedTask } from "@shared/contracts/project-share";
import type { ProjectStatus } from "@shared/contracts/projects";
import { EventRangeQuery, type TaskData, type TaskDto, type TaskStatus } from "@shared/contracts/project-detail";
import { eventService, toEventDto } from "./event.service";
import { expenseService } from "./expense.service";
import { projectFileService } from "./file.service";
import { noteService } from "./note.service";
import { projectDetailService } from "./project-detail.service";
import { taskService, toTaskDto } from "./task.service";
import { masterService } from "@server/modules/masters";
import { projectAudit, requireProject, UUID, ymd } from "./project-scope";

// Shareable project links: anyone holding the URL can view the project without logging in,
// and (if allowed) add/update tasks. Tokens are 32 random bytes, stored only as sha256.

const TOKEN = /^[A-Za-z0-9_-]{20,100}$/;
const shareUrl = (token: string) => `${env.APP_URL}/share/${token}`;
const iso = (d: unknown) => (d instanceof Date ? d.toISOString() : null);

function linkStatus(l: Model): ShareLinkDto["status"] {
  if (l.get("revokedAt")) return "revoked";
  const exp = l.get("expiresAt") as Date | null;
  return exp && exp.getTime() < Date.now() ? "expired" : "active";
}

function toLinkDto(l: Model): ShareLinkDto {
  const perms = (l.get("permissions") as Record<string, boolean>) ?? {};
  return {
    id: l.get("id") as string,
    label: (l.get("label") as string) ?? "Shared link",
    allow_tasks: !!perms.tasks_write,
    status: linkStatus(l),
    created_at: iso(l.get("createdAt"))!,
    created_by: ((l.get("createdBy") as Model | null)?.get("name") as string | undefined) ?? null,
    expires_at: iso(l.get("expiresAt")),
    last_accessed_at: iso(l.get("lastAccessedAt")),
    revoked_at: iso(l.get("revokedAt")),
  };
}

function toSharedTask(t: Model): SharedTask {
  return {
    id: t.get("id") as string,
    title: t.get("title") as string,
    description: (t.get("description") as string | null) ?? null,
    status: t.get("status") as TaskStatus,
    due_date: ymd(t.get("dueAt")),
    completed_at: iso(t.get("completedAt")),
    created_at: iso(t.get("createdAt"))!,
  };
}

/** Active link for a token, or the same 404 for anything else (unknown, revoked, expired). */
async function linkByToken(token: string) {
  if (!TOKEN.test(token)) throw Errors.notFound("Link");
  const l = await CustomerPortalLink.findOne({ where: { tokenHash: sha256(token) } });
  if (!l || linkStatus(l) !== "active") throw Errors.notFound("Link");
  return l;
}

/** Project activity entry for a change made through a link (no user session). */
async function linkAudit(l: Model, action: string, detail: { before?: object; after: object }) {
  const rc = getRequestContext();
  await prisma.auditLog.create({
    data: {
      organizationId: l.get("organizationId") as string,
      actorType: "customer",
      action,
      entityType: "project",
      entityId: l.get("projectId") as string,
      requestId: rc?.requestId,
      ipAddress: rc?.ipAddress,
      userAgent: rc?.userAgent,
      beforeSnapshot: (detail.before ?? undefined) as never,
      afterSnapshot: { ...detail.after, via_link: l.get("id"), link_label: l.get("label") } as never,
    },
  });
}

const taskRow = (d: TaskData) => ({
  title: d.title,
  description: d.description,
  status: d.status,
  priority: d.priority,
  assigneeMembershipId: d.assignee_membership_id,
  dueAt: d.due_date ? new Date(`${d.due_date}T12:00:00Z`) : null,
});

const taskInclude = [{ model: OrganizationMembership, as: "assignee", attributes: ["id"], include: [{ model: User, as: "user", attributes: ["name"] }] }];

const findTask = (l: Model, taskId: string) =>
  UUID.test(taskId)
    ? ProjectTask.findOne({ where: { id: taskId, projectId: l.get("projectId"), organizationId: l.get("organizationId") }, include: taskInclude })
    : Promise.resolve(null);

async function assertAssignee(l: Model, id: string | null) {
  if (!id) return;
  const ok = await OrganizationMembership.count({ where: { id, organizationId: l.get("organizationId"), status: "active" } });
  if (!ok) throw Errors.validation({ assignee_membership_id: ["Choose an active team member."] });
}

/** Read-only context for a link: the link creator's company, read permissions only. */
function readContext(l: Model): TenantContext {
  return {
    userId: l.get("createdByUserId") as string,
    organizationId: l.get("organizationId") as string,
    membershipId: "",
    permissions: new Set(["project.read", "customer.read", "invoice.read", "file.read"] as const),
    requestId: getRequestContext()?.requestId ?? "share-link",
  };
}

export const shareService = {
  // ------------------------------------------------------------ contractor side

  async list(ctx: TenantContext, projectId: string): Promise<ShareLinkDto[]> {
    await requireProject(ctx, projectId);
    const rows = await CustomerPortalLink.findAll({
      where: { projectId, organizationId: ctx.organizationId },
      include: [{ model: User, as: "createdBy", attributes: ["name"] }],
      order: [["createdAt", "DESC"]],
    });
    return rows.map(toLinkDto);
  },

  async create(ctx: TenantContext, projectId: string, input: { label: string; expires_in_days: number; allow_tasks: boolean }): Promise<NewShareLink> {
    await requireProject(ctx, projectId, "project.write");
    const token = randomToken();
    const project = await Project.findByPk(projectId, { attributes: ["customerId"] });
    const l = await CustomerPortalLink.create({
      organizationId: ctx.organizationId,
      projectId,
      customerId: project?.get("customerId") ?? null,
      tokenHash: sha256(token),
      label: input.label,
      permissions: { read_project: true, tasks_write: input.allow_tasks },
      expiresAt: input.expires_in_days ? new Date(Date.now() + input.expires_in_days * 86_400_000) : null,
      createdByUserId: ctx.userId,
    });
    await projectAudit(ctx, projectId, "share_link.created", { after: { label: input.label, allow_tasks: input.allow_tasks, link_id: l.get("id") } });
    const full = await CustomerPortalLink.findByPk(l.get("id") as string, { include: [{ model: User, as: "createdBy", attributes: ["name"] }] });
    return { link: toLinkDto(full!), url: shareUrl(token) };
  },

  async revoke(ctx: TenantContext, projectId: string, linkId: string): Promise<ShareLinkDto> {
    await requireProject(ctx, projectId, "project.write");
    const l = UUID.test(linkId)
      ? await CustomerPortalLink.findOne({ where: { id: linkId, projectId, organizationId: ctx.organizationId }, include: [{ model: User, as: "createdBy", attributes: ["name"] }] })
      : null;
    if (!l) throw Errors.notFound("Link");
    if (!l.get("revokedAt")) {
      await l.update({ revokedAt: new Date() });
      await projectAudit(ctx, projectId, "share_link.revoked", { before: { label: l.get("label") } });
    }
    return toLinkDto(l);
  },

  // ------------------------------------------------------------ link holder side

  async view(token: string): Promise<SharedProject> {
    const l = await linkByToken(token);
    const projectId = l.get("projectId") as string;
    const organizationId = l.get("organizationId") as string;
    const [p, org, tasks, events] = await Promise.all([
      Project.findOne({
        where: { id: projectId, organizationId },
        include: [
          { model: Customer, as: "customer", attributes: ["displayName"] },
          { model: Property, as: "property" },
        ],
      }),
      Organization.findByPk(organizationId),
      ProjectTask.findAll({
        where: { projectId, organizationId, status: { [Op.ne]: "cancelled" } },
        order: [
          [sequelize.literal(`CASE "ProjectTask"."status" WHEN 'in_progress' THEN 0 WHEN 'todo' THEN 1 WHEN 'blocked' THEN 2 ELSE 3 END`), "ASC"],
          ["dueAt", "ASC NULLS LAST"],
          ["createdAt", "ASC"],
        ],
      }),
      ProjectEvent.findAll({
        // From two weeks ago onward, so recent and upcoming work both show.
        where: { projectId, organizationId, endAt: { [Op.gte]: new Date(Date.now() - 14 * 86_400_000) } },
        order: [["startAt", "ASC"]],
        limit: 50,
      }),
    ]);
    if (!p) throw Errors.notFound("Link");

    // Record a view at most every 10 minutes per link.
    const last = l.get("lastAccessedAt") as Date | null;
    if (!last || Date.now() - last.getTime() > 10 * 60_000) {
      await l.update({ lastAccessedAt: new Date() });
      await CustomerPortalEvent.create({
        organizationId,
        portalLinkId: l.get("id"),
        eventType: "viewed",
        entityType: "project",
        entityId: projectId,
        occurredAt: new Date(),
        metadata: { ip: getRequestContext()?.ipAddress ?? null },
      });
    }

    const s = p.get("property") as Model | null;
    const site = s
      ? [s.get("addressLine1"), s.get("addressLine2"), `${s.get("city")}, ${s.get("state")} ${s.get("postalCode")}`].filter(Boolean).join(", ")
      : "";
    const shared = tasks.map(toSharedTask);
    const perms = (l.get("permissions") as Record<string, boolean>) ?? {};
    return {
      label: (l.get("label") as string) ?? "",
      allow_tasks: !!perms.tasks_write,
      company: {
        name: (org?.get("name") as string) ?? "",
        phone: (org?.get("phone") as string | null) ?? null,
        email: (org?.get("email") as string | null) ?? null,
        logo_url: org?.get("logoFileId") ? `/api/v1/portal/projects/${token}/logo` : null,
      },
      project: {
        project_number: p.get("projectNumber") as string,
        name: p.get("name") as string,
        status: p.get("status") as ProjectStatus,
        planned_start_date: ymd(p.get("plannedStartDate")),
        planned_end_date: ymd(p.get("plannedEndDate")),
        site,
        customer: ((p.get("customer") as Model | null)?.get("displayName") as string) ?? "",
      },
      progress: { total: shared.length, done: shared.filter((t) => t.status === "done").length },
      schedule: events.map(toEventDto),
      tasks: shared,
      expires_at: iso(l.get("expiresAt")),
    };
  },

  async createTask(token: string, input: TaskData & { by_name: string }): Promise<TaskDto> {
    const l = await linkByToken(token);
    if (!(l.get("permissions") as Record<string, boolean>)?.tasks_write) throw Errors.forbidden();
    await assertAssignee(l, input.assignee_membership_id);
    const t = await ProjectTask.create({
      organizationId: l.get("organizationId"),
      projectId: l.get("projectId"),
      createdByUserId: l.get("createdByUserId"), // the person who shared the link owns it
      ...taskRow(input),
      completedAt: input.status === "done" ? new Date() : null,
    });
    const dto = toTaskDto((await findTask(l, t.get("id") as string))!);
    await linkAudit(l, input.status === "done" ? "task.completed" : "task.created", { after: { ...dto, by_name: input.by_name } });
    return dto;
  },

  async updateTask(token: string, taskId: string, input: TaskData & { by_name: string }): Promise<TaskDto> {
    const l = await linkByToken(token);
    if (!(l.get("permissions") as Record<string, boolean>)?.tasks_write) throw Errors.forbidden();
    const t = await findTask(l, taskId);
    if (!t) throw Errors.notFound("Task");
    const before = toTaskDto(t);
    if (input.assignee_membership_id !== before.assignee?.id) await assertAssignee(l, input.assignee_membership_id);
    const completedAt = input.status === "done" ? (before.status === "done" ? t.get("completedAt") : new Date()) : null;
    await t.update({ ...taskRow(input), completedAt });
    const after = toTaskDto((await findTask(l, taskId))!);
    const action = before.status !== "done" && after.status === "done" ? "task.completed" : "task.updated";
    await linkAudit(l, action, { before, after: { ...after, by_name: input.by_name } });
    return after;
  },

  /**
   * Read-only access to every project tab through a link. Runs the same services the
   * staff page uses, under a context that only carries read permissions.
   */
  async read(token: string, path: string[], search: URLSearchParams): Promise<unknown> {
    const l = await linkByToken(token);
    const ctx = readContext(l);
    const projectId = l.get("projectId") as string;
    const [section, id, sub] = path;
    switch (section) {
      case "overview":
        return projectDetailService.overview(ctx, projectId);
      case "activity":
        return projectDetailService.activity(ctx, projectId);
      case "invoices":
        return projectDetailService.invoices(ctx, projectId);
      case "change-orders":
        return projectDetailService.changeOrders(ctx, projectId);
      case "tasks":
        return taskService.list(ctx, projectId);
      case "assignees":
        return taskService.assignees(ctx, projectId);
      case "expenses":
        if (id && sub === "receipt") return { file: await expenseService.receipt(ctx, projectId, id), inline: true };
        return expenseService.list(ctx, projectId);
      case "events": {
        const { from, to } = EventRangeQuery.parse({ from: search.get("from"), to: search.get("to") });
        return eventService.list(ctx, projectId, from, to);
      }
      case "files":
        if (id) {
          const f = await projectFileService.download(ctx, projectId, id);
          return { file: f, inline: f.inline && search.get("download") !== "1" };
        }
        return projectFileService.list(ctx, projectId);
      case "masters":
        if (id !== "expense_category" && id !== "payment_method") throw Errors.notFound("Page");
        return masterService.options(id);
      case "notes":
        return (await noteService.list(ctx, projectId)).map((n) => ({ ...n, is_mine: false }));
      default:
        throw Errors.notFound("Page");
    }
  },

  async orgForToken(token: string) {
    return (await linkByToken(token)).get("organizationId") as string;
  },
};
