import "server-only";
import { Op, type Model } from "sequelize";
import { OrganizationMembership, ProjectTask, User } from "@server/core/db/models";
import { Errors } from "@server/core/http/errors";
import type { TenantContext } from "@server/core/tenancy/context";
import type { AssigneeOption, TaskData, TaskDto } from "@shared/contracts/project-detail";
import { projectAudit, requireProject, UUID, ymd } from "./project-scope";

const include = [
  {
    model: OrganizationMembership,
    as: "assignee",
    attributes: ["id"],
    include: [{ model: User, as: "user", attributes: ["name"] }],
  },
];

export function toTaskDto(t: Model): TaskDto {
  const a = t.get("assignee") as Model | null;
  const iso = (d: unknown) => (d instanceof Date ? d.toISOString() : null);
  return {
    id: t.get("id") as string,
    title: t.get("title") as string,
    description: (t.get("description") as string | null) ?? null,
    status: t.get("status") as TaskDto["status"],
    priority: t.get("priority") as TaskDto["priority"],
    assignee: a ? { id: a.get("id") as string, name: (a.get("user") as Model).get("name") as string } : null,
    due_date: ymd(t.get("dueAt")),
    completed_at: iso(t.get("completedAt")),
    created_at: iso(t.get("createdAt"))!,
  };
}

/** Status first (open work on top), then due date. */
const ORDER = [
  [ProjectTask.sequelize!.literal(`CASE "ProjectTask"."status" WHEN 'in_progress' THEN 0 WHEN 'todo' THEN 1 WHEN 'blocked' THEN 2 WHEN 'done' THEN 3 ELSE 4 END`), "ASC"],
  ["dueAt", "ASC NULLS LAST"],
  ["createdAt", "ASC"],
] as never;

async function assertAssignee(ctx: TenantContext, id: string | null) {
  if (!id) return;
  const ok = await OrganizationMembership.count({ where: { id, organizationId: ctx.organizationId, status: "active" } });
  if (!ok) throw Errors.validation({ assignee_membership_id: ["Choose an active team member."] });
}

const row = (d: TaskData) => ({
  title: d.title,
  description: d.description,
  status: d.status,
  priority: d.priority,
  assigneeMembershipId: d.assignee_membership_id,
  // Due dates are whole days; noon UTC keeps the calendar date stable in every US time zone.
  dueAt: d.due_date ? new Date(`${d.due_date}T12:00:00Z`) : null,
});

async function findTask(ctx: TenantContext, projectId: string, taskId: string) {
  const t = UUID.test(taskId)
    ? await ProjectTask.findOne({ where: { id: taskId, projectId, organizationId: ctx.organizationId }, include })
    : null;
  if (!t) throw Errors.notFound("Task");
  return t;
}

export const taskService = {
  async list(ctx: TenantContext, projectId: string): Promise<TaskDto[]> {
    await requireProject(ctx, projectId);
    const rows = await ProjectTask.findAll({ where: { projectId, organizationId: ctx.organizationId }, include, order: ORDER });
    return rows.map(toTaskDto);
  },

  /** Active team members a task can be assigned to. */
  async assignees(ctx: TenantContext, projectId: string): Promise<AssigneeOption[]> {
    await requireProject(ctx, projectId);
    const rows = await OrganizationMembership.findAll({
      where: { organizationId: ctx.organizationId, status: "active" },
      include: [{ model: User, as: "user", attributes: ["name"] }],
      order: [[{ model: User, as: "user" }, "name", "ASC"]],
    });
    return rows.map((m) => ({ id: m.get("id") as string, name: (m.get("user") as Model).get("name") as string }));
  },

  async create(ctx: TenantContext, projectId: string, input: TaskData): Promise<TaskDto> {
    await requireProject(ctx, projectId, "project.write");
    await assertAssignee(ctx, input.assignee_membership_id);
    const t = await ProjectTask.create({
      organizationId: ctx.organizationId,
      projectId,
      createdByUserId: ctx.userId,
      ...row(input),
      completedAt: input.status === "done" ? new Date() : null,
    });
    const dto = toTaskDto(await findTask(ctx, projectId, t.get("id") as string));
    await projectAudit(ctx, projectId, "task.created", { after: dto });
    return dto;
  },

  async update(ctx: TenantContext, projectId: string, taskId: string, input: TaskData): Promise<TaskDto> {
    await requireProject(ctx, projectId, "project.write");
    const t = await findTask(ctx, projectId, taskId);
    const before = toTaskDto(t);
    if (input.assignee_membership_id !== before.assignee?.id) await assertAssignee(ctx, input.assignee_membership_id);
    const completedAt =
      input.status === "done" ? (before.status === "done" ? t.get("completedAt") : new Date()) : null;
    await t.update({ ...row(input), completedAt });
    const after = toTaskDto(await findTask(ctx, projectId, taskId));
    await projectAudit(ctx, projectId, before.status !== after.status && after.status === "done" ? "task.completed" : "task.updated", { before, after });
    return after;
  },

  async remove(ctx: TenantContext, projectId: string, taskId: string): Promise<void> {
    await requireProject(ctx, projectId, "project.write");
    const t = await findTask(ctx, projectId, taskId);
    const before = toTaskDto(t);
    await ProjectTask.destroy({ where: { parentTaskId: taskId } });
    await t.destroy();
    await projectAudit(ctx, projectId, "task.deleted", { before });
  },

  async counts(ctx: TenantContext, projectId: string) {
    const where = { projectId, organizationId: ctx.organizationId, status: { [Op.ne]: "cancelled" } };
    const [total, done] = await Promise.all([ProjectTask.count({ where }), ProjectTask.count({ where: { ...where, status: "done" } })]);
    return { total, done };
  },

  async open(ctx: TenantContext, projectId: string, limit: number): Promise<TaskDto[]> {
    const rows = await ProjectTask.findAll({
      where: { projectId, organizationId: ctx.organizationId, status: ["todo", "in_progress", "blocked"] },
      include,
      order: ORDER,
      limit,
    });
    return rows.map(toTaskDto);
  },
};
