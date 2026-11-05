import { z } from "zod";
import type { ProjectEventDto } from "./project-detail";

// Company-wide calendar (/calendar): schedule items, task due dates and project start/finish dates.

export const CALENDAR_KINDS = ["event", "task", "milestone"] as const;
export type CalendarKind = (typeof CALENDAR_KINDS)[number];

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.");

export const CalendarQuery = z
  .object({
    from: dateOnly,
    to: dateOnly,
    project_id: z.string().uuid().optional(),
    kind: z.enum([...CALENDAR_KINDS, "all"]).default("all"),
  })
  .refine((v) => v.to >= v.from, { path: ["to"], message: "Range end must be after its start." })
  // Keeps one request bounded: a 6-week month grid or a few months of agenda.
  .refine((v) => (Date.parse(v.to) - Date.parse(v.from)) / 86_400_000 <= 200, { path: ["to"], message: "Range is too long." });
export type CalendarQuery = z.input<typeof CalendarQuery>;

export type CalendarItemDto = {
  key: string; // unique across kinds
  kind: CalendarKind;
  title: string;
  start_date: string;
  end_date: string;
  all_day: boolean;
  start_time: string | null;
  end_time: string | null;
  project: { id: string; number: string; name: string };
  /** task status, or "start" / "finish" for milestones */
  detail: string | null;
  /** present for kind "event", so it can be edited in place */
  event: ProjectEventDto | null;
};
