import "server-only";
import { Op, type Model, type WhereOptions } from "sequelize";
import { Project, ProjectEvent, ProjectTask } from "@server/core/db/models";
import { authorize } from "@server/core/authorization/policy";
import type { TenantContext } from "@server/core/tenancy/context";
import type { CalendarItemDto, CalendarKind } from "@shared/contracts/calendar";
import { toEventDto, toInstant } from "@server/modules/projects";

const projectRef = (p: Model) => ({
  id: p.get("id") as string,
  number: p.get("projectNumber") as string,
  name: p.get("name") as string,
});
const projectInclude = { model: Project, as: "project", attributes: ["id", "projectNumber", "name"] };
const ymd = (v: unknown) => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10));

export const calendarService = {
  /** Everything dated in [from, to] (inclusive) across the company's projects. */
  async list(
    ctx: TenantContext,
    q: { from: string; to: string; project_id?: string; kind: CalendarKind | "all" },
  ): Promise<CalendarItemDto[]> {
    authorize(ctx, "project.read");
    const org = { organizationId: ctx.organizationId, ...(q.project_id && { projectId: q.project_id }) };
    const want = (k: CalendarKind) => q.kind === "all" || q.kind === k;
    const [events, tasks, projects] = await Promise.all([
      want("event")
        ? ProjectEvent.findAll({
            where: {
              ...org,
              startAt: { [Op.lte]: toInstant(q.to, "23:59") },
              endAt: { [Op.gte]: toInstant(q.from, null) },
            },
            include: [projectInclude],
            order: [["startAt", "ASC"]],
            limit: 1000,
          })
        : [],
      want("task")
        ? ProjectTask.findAll({
            // Due dates are stored at noon UTC, so this range keeps them on their calendar day.
            where: {
              ...org,
              status: { [Op.ne]: "cancelled" },
              dueAt: { [Op.between]: [toInstant(q.from, null), toInstant(q.to, "23:59")] },
            },
            include: [projectInclude],
            limit: 1000,
          })
        : [],
      want("milestone")
        ? Project.findAll({
            where: {
              organizationId: ctx.organizationId,
              ...(q.project_id && { id: q.project_id }),
              status: { [Op.ne]: "cancelled" },
              [Op.or]: [
                { plannedStartDate: { [Op.between]: [q.from, q.to] } },
                { plannedEndDate: { [Op.between]: [q.from, q.to] } },
              ],
            } as WhereOptions,
            attributes: ["id", "projectNumber", "name", "plannedStartDate", "plannedEndDate"],
            limit: 1000,
          })
        : [],
    ]);

    const items: CalendarItemDto[] = [];
    for (const e of events) {
      const ev = toEventDto(e);
      items.push({
        key: `event:${ev.id}`,
        kind: "event",
        title: ev.title,
        start_date: ev.start_date,
        end_date: ev.end_date,
        all_day: ev.all_day,
        start_time: ev.start_time,
        end_time: ev.end_time,
        project: projectRef(e.get("project") as Model),
        detail: null,
        event: ev,
      });
    }
    for (const t of tasks) {
      const day = ymd(t.get("dueAt"));
      items.push({
        key: `task:${t.get("id")}`,
        kind: "task",
        title: t.get("title") as string,
        start_date: day,
        end_date: day,
        all_day: true,
        start_time: null,
        end_time: null,
        project: projectRef(t.get("project") as Model),
        detail: t.get("status") as string,
        event: null,
      });
    }
    for (const p of projects) {
      for (const [col, label] of [
        ["plannedStartDate", "start"],
        ["plannedEndDate", "finish"],
      ] as const) {
        const d = p.get(col) ? ymd(p.get(col)) : null;
        if (!d || d < q.from || d > q.to) continue;
        items.push({
          key: `milestone:${p.get("id")}:${label}`,
          kind: "milestone",
          title: `${label === "start" ? "Start" : "Target finish"}: ${p.get("name")}`,
          start_date: d,
          end_date: d,
          all_day: true,
          start_time: null,
          end_time: null,
          project: projectRef(p),
          detail: label,
          event: null,
        });
      }
    }
    // Day, then timed items by time, all-day first.
    return items.sort(
      (a, b) =>
        a.start_date.localeCompare(b.start_date) ||
        Number(!a.all_day) - Number(!b.all_day) ||
        (a.start_time ?? "").localeCompare(b.start_time ?? "") ||
        a.title.localeCompare(b.title),
    );
  },
};
