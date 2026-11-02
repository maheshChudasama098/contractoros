import { z } from "zod";
import type { ProjectDto } from "./projects";

// Project detail page (/projects/[id]) contracts: overview, tasks, expenses, schedule, files, notes, activity.

const optText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => v || null);

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.");
const amount = z
  .string()
  .trim()
  .regex(/^\d{1,10}(\.\d{1,2})?$/, "Enter an amount like 120 or 120.50.");

// ---------------------------------------------------------------- Overview

export type ProjectOverview = {
  project: ProjectDto;
  customer: { id: string; display_name: string; email: string | null; phone: string | null };
  money: {
    contract_value: string;
    invoiced: string;
    paid: string;
    outstanding: string; // issued but unpaid
    remaining_to_bill: string;
    expenses: string;
  };
  tasks: { total: number; done: number };
  upcoming: ProjectEventDto[];
  open_tasks: TaskDto[];
};

// ---------------------------------------------------------------- Tasks

export const TASK_STATUSES = ["todo", "in_progress", "blocked", "done", "cancelled"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  blocked: "Blocked",
  done: "Done",
  cancelled: "Cancelled",
};

export const TaskInput = z.object({
  title: z.string().trim().min(1, "Task title is required.").max(180),
  description: optText(5000),
  status: z.enum(TASK_STATUSES).default("todo"),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  assignee_membership_id: z.string().uuid().nullish().or(z.literal("")).transform((v) => v || null),
  due_date: dateOnly.or(z.literal("")).nullish().transform((v) => v || null),
});
export type TaskInput = z.input<typeof TaskInput>;
export type TaskData = z.output<typeof TaskInput>;

export type TaskDto = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: "low" | "normal" | "high" | "urgent";
  assignee: { id: string; name: string } | null;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
};

export type AssigneeOption = { id: string; name: string };

// ---------------------------------------------------------------- Expenses

export const ExpenseInput = z.object({
  expense_date: dateOnly,
  description: z.string().trim().min(1, "Description is required.").max(255),
  category: optText(64),
  vendor: optText(160),
  amount: amount,
  payment_method: optText(64),
});
export type ExpenseInput = z.input<typeof ExpenseInput>;
export type ExpenseData = z.output<typeof ExpenseInput>;

export type ExpenseDto = {
  id: string;
  expense_date: string;
  description: string;
  category: { code: string; name: string } | null;
  vendor: string | null;
  amount: string;
  payment_method: { code: string; name: string } | null;
  receipt: { id: string; filename: string } | null;
  created_at: string;
};

export const RECEIPT_MAX_BYTES = 10 * 1024 * 1024;

// ---------------------------------------------------------------- Schedule

export const ProjectEventInput = z
  .object({
    title: z.string().trim().min(1, "Title is required.").max(180),
    start_date: dateOnly,
    end_date: dateOnly,
    all_day: z.boolean().default(true),
    start_time: z.string().regex(/^\d{2}:\d{2}$/).or(z.literal("")).nullish().transform((v) => v || null),
    end_time: z.string().regex(/^\d{2}:\d{2}$/).or(z.literal("")).nullish().transform((v) => v || null),
    notes: optText(5000),
  })
  .refine((v) => v.end_date >= v.start_date, { path: ["end_date"], message: "End date can't be before the start date." })
  .refine((v) => v.all_day || (v.start_time && v.end_time), { path: ["start_time"], message: "Enter start and end times." })
  .refine((v) => v.all_day || v.end_date > v.start_date || (v.end_time ?? "") > (v.start_time ?? ""), {
    path: ["end_time"],
    message: "End time must be after the start time.",
  });
export type ProjectEventInput = z.input<typeof ProjectEventInput>;
export type ProjectEventData = z.output<typeof ProjectEventInput>;

export const EventRangeQuery = z.object({ from: dateOnly, to: dateOnly });

/** Dates/times are wall-clock values in the company's time zone (no UTC shifting in the UI). */
export type ProjectEventDto = {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  all_day: boolean;
  start_time: string | null;
  end_time: string | null;
  notes: string | null;
};

// ---------------------------------------------------------------- Files

export const PROJECT_FILE_MAX_BYTES = 20 * 1024 * 1024;

export type ProjectFileDto = {
  id: string; // document link id
  file_id: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  is_image: boolean;
  uploaded_by: string | null;
  created_at: string;
};

// ---------------------------------------------------------------- Notes & activity

export const NoteInput = z.object({ body: z.string().trim().min(1, "Write a note first.").max(5000) });
export type NoteInput = z.infer<typeof NoteInput>;

export type NoteDto = { id: string; body: string; author: string | null; created_at: string; is_mine: boolean };

export type ActivityDto = { id: string; action: string; summary: string; actor: string | null; created_at: string };

// ---------------------------------------------------------------- Finances (read-only until those modules exist)

export type ProjectInvoiceDto = {
  id: string;
  invoice_number: string;
  status: string;
  issue_date: string;
  due_date: string | null;
  total: string;
  amount_paid: string;
  balance_due: string;
};

export type ProjectChangeOrderDto = {
  id: string;
  change_order_number: string;
  title: string;
  status: string;
  price_delta: string;
  created_at: string;
};
