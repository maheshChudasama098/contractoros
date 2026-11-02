import { z } from "zod";
import { PaginationQuery } from "./pagination";

// Project contracts shared by /api/v1/projects and the web UI.

export const PROJECT_STATUSES = ["planned", "scheduled", "active", "on_hold", "completed", "cancelled"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];
export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  planned: "Planned",
  scheduled: "Scheduled",
  active: "Active",
  on_hold: "On hold",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export type Priority = (typeof PRIORITIES)[number];

const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.")
  .or(z.literal(""))
  .nullish()
  .transform((v) => v || null);

export const ProjectInput = z
  .object({
    name: z.string().trim().min(1, "Project name is required.").max(180),
    customer_id: z.string().uuid("Choose a customer."),
    status: z.enum(PROJECT_STATUSES).default("planned"),
    priority: z.enum(PRIORITIES).default("normal"),
    planned_start_date: date,
    planned_end_date: date,
    // Dollars as a string to avoid float rounding; stored as NUMERIC(12,2).
    contract_value: z
      .string()
      .trim()
      .regex(/^\d{1,10}(\.\d{1,2})?$/, "Enter an amount like 25000 or 25000.50.")
      .or(z.literal(""))
      .nullish()
      .transform((v) => v || "0"),
    site_address_line1: z.string().trim().min(1, "Job site address is required.").max(180),
    site_address_line2: z
      .string()
      .trim()
      .max(180)
      .nullish()
      .transform((v) => v || null),
    site_city: z.string().trim().min(1, "City is required.").max(100),
    site_state: z.string().trim().min(1, "State is required.").max(80),
    site_postal_code: z.string().trim().min(1, "ZIP code is required.").max(20),
  })
  .refine((v) => !v.planned_start_date || !v.planned_end_date || v.planned_end_date >= v.planned_start_date, {
    path: ["planned_end_date"],
    message: "End date can't be before the start date.",
  });
export type ProjectInput = z.input<typeof ProjectInput>;
export type ProjectData = z.output<typeof ProjectInput>;

export const ProjectListQuery = PaginationQuery.extend({
  q: z.string().trim().max(100).optional(),
  status: z.enum([...PROJECT_STATUSES, "open", "all"]).default("open"),
  customer_id: z.string().uuid().optional(),
});
export type ProjectListQuery = z.input<typeof ProjectListQuery>;

export type ProjectDto = {
  id: string;
  project_number: string;
  name: string;
  status: ProjectStatus;
  priority: Priority;
  planned_start_date: string | null;
  planned_end_date: string | null;
  contract_value: string;
  customer: { id: string; display_name: string };
  site: { address_line1: string; address_line2: string | null; city: string; state: string; postal_code: string };
  created_at: string;
};

/** Statuses counted as "open" work in the default list view. */
export const OPEN_PROJECT_STATUSES: ProjectStatus[] = ["planned", "scheduled", "active", "on_hold"];
