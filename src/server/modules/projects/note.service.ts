import "server-only";
import type { Model } from "sequelize";
import { Activity, User } from "@server/core/db/models";
import { Errors } from "@server/core/http/errors";
import type { TenantContext } from "@server/core/tenancy/context";
import type { NoteDto } from "@shared/contracts/project-detail";
import { projectAudit, requireProject, UUID } from "./project-scope";

// Project notes are "note" activities on the project (activities table).
const where = (ctx: TenantContext, projectId: string) => ({
  organizationId: ctx.organizationId,
  subjectType: "project",
  subjectId: projectId,
  activityType: "note",
});

const include = [{ model: User, as: "createdBy", attributes: ["name"] }];

const toDto = (n: Model, ctx: TenantContext): NoteDto => ({
  id: n.get("id") as string,
  body: (n.get("body") as string) ?? "",
  author: ((n.get("createdBy") as Model | null)?.get("name") as string | undefined) ?? null,
  created_at: (n.get("occurredAt") as Date).toISOString(),
  is_mine: n.get("createdByUserId") === ctx.userId,
});

export const noteService = {
  async list(ctx: TenantContext, projectId: string): Promise<NoteDto[]> {
    await requireProject(ctx, projectId);
    const rows = await Activity.findAll({ where: where(ctx, projectId), include, order: [["occurredAt", "DESC"]], limit: 200 });
    return rows.map((n) => toDto(n, ctx));
  },

  async create(ctx: TenantContext, projectId: string, body: string): Promise<NoteDto> {
    await requireProject(ctx, projectId, "project.write");
    const n = await Activity.create({
      ...where(ctx, projectId),
      title: body.slice(0, 180),
      body,
      occurredAt: new Date(),
      createdByUserId: ctx.userId,
    });
    await projectAudit(ctx, projectId, "note.added", { after: { body: body.slice(0, 200) } });
    const created = await Activity.findByPk(n.get("id") as string, { include });
    return toDto(created!, ctx);
  },

  /** Authors can delete their own notes; project editors can delete any. */
  async remove(ctx: TenantContext, projectId: string, id: string): Promise<void> {
    await requireProject(ctx, projectId, "project.write");
    const n = UUID.test(id) ? await Activity.findOne({ where: { id, ...where(ctx, projectId) } }) : null;
    if (!n) throw Errors.notFound("Note");
    await n.destroy();
    await projectAudit(ctx, projectId, "note.deleted", { before: { body: String(n.get("body") ?? "").slice(0, 200) } });
  },
};
