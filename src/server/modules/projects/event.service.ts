import "server-only";
import { Op, type Model } from "sequelize";
import { ProjectEvent } from "@server/core/db/models";
import { Errors } from "@server/core/http/errors";
import type { TenantContext } from "@server/core/tenancy/context";
import type { ProjectEventData, ProjectEventDto } from "@shared/contracts/project-detail";
import { projectAudit, requireProject, UUID } from "./project-scope";

// Events are wall-clock times in the company's zone. They're stored as if UTC ("floating"),
// so 9:00 entered is 9:00 shown, whatever the server or browser zone.
const toInstant = (date: string, time: string | null) => new Date(`${date}T${time ?? "00:00"}:00Z`);
const datePart = (d: Date) => d.toISOString().slice(0, 10);
const timePart = (d: Date) => d.toISOString().slice(11, 16);

function toDto(e: Model): ProjectEventDto {
  const start = e.get("startAt") as Date;
  const end = e.get("endAt") as Date;
  const allDay = e.get("allDay") as boolean;
  return {
    id: e.get("id") as string,
    title: e.get("title") as string,
    start_date: datePart(start),
    end_date: datePart(end),
    all_day: allDay,
    start_time: allDay ? null : timePart(start),
    end_time: allDay ? null : timePart(end),
    notes: (e.get("notes") as string | null) ?? null,
  };
}

const row = (d: ProjectEventData) => ({
  title: d.title,
  allDay: d.all_day,
  startAt: toInstant(d.start_date, d.all_day ? null : d.start_time),
  endAt: toInstant(d.end_date, d.all_day ? "23:59" : d.end_time),
  notes: d.notes,
});

async function findEvent(ctx: TenantContext, projectId: string, id: string) {
  const e = UUID.test(id) ? await ProjectEvent.findOne({ where: { id, projectId, organizationId: ctx.organizationId } }) : null;
  if (!e) throw Errors.notFound("Schedule item");
  return e;
}

export const eventService = {
  /** Events overlapping [from, to] (inclusive dates). */
  async list(ctx: TenantContext, projectId: string, from: string, to: string): Promise<ProjectEventDto[]> {
    await requireProject(ctx, projectId);
    const rows = await ProjectEvent.findAll({
      where: {
        projectId,
        organizationId: ctx.organizationId,
        startAt: { [Op.lte]: toInstant(to, "23:59") },
        endAt: { [Op.gte]: toInstant(from, null) },
      },
      order: [["startAt", "ASC"]],
      limit: 500,
    });
    return rows.map(toDto);
  },

  async upcoming(ctx: TenantContext, projectId: string, today: string, limit: number): Promise<ProjectEventDto[]> {
    const rows = await ProjectEvent.findAll({
      where: { projectId, organizationId: ctx.organizationId, endAt: { [Op.gte]: toInstant(today, null) } },
      order: [["startAt", "ASC"]],
      limit,
    });
    return rows.map(toDto);
  },

  async create(ctx: TenantContext, projectId: string, input: ProjectEventData): Promise<ProjectEventDto> {
    await requireProject(ctx, projectId, "project.write");
    const e = await ProjectEvent.create({ organizationId: ctx.organizationId, projectId, createdByUserId: ctx.userId, ...row(input) });
    const dto = toDto(e);
    await projectAudit(ctx, projectId, "schedule.created", { after: dto });
    return dto;
  },

  async update(ctx: TenantContext, projectId: string, id: string, input: ProjectEventData): Promise<ProjectEventDto> {
    await requireProject(ctx, projectId, "project.write");
    const e = await findEvent(ctx, projectId, id);
    const before = toDto(e);
    await e.update(row(input));
    const after = toDto(e);
    await projectAudit(ctx, projectId, "schedule.updated", { before, after });
    return after;
  },

  async remove(ctx: TenantContext, projectId: string, id: string): Promise<void> {
    await requireProject(ctx, projectId, "project.write");
    const e = await findEvent(ctx, projectId, id);
    const before = toDto(e);
    await e.destroy();
    await projectAudit(ctx, projectId, "schedule.deleted", { before });
  },
};
