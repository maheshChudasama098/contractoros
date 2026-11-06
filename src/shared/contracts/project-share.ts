import { z } from "zod";
import { TaskInput, type ProjectEventDto, type TaskStatus } from "./project-detail";
import type { ProjectStatus } from "./projects";

// Shareable project links (/api/v1/projects/{id}/share-links) and the public, login-free
// project page they open (/api/v1/portal/projects/{token}). Read-only, except tasks.

export const CreateShareLinkInput = z.object({
  label: z.string().trim().min(1, "Who is this link for?").max(120),
  /** 0 = never expires. */
  expires_in_days: z.coerce.number().int().min(0).max(365).default(0),
  allow_tasks: z.boolean().default(true),
});
export type CreateShareLinkInput = z.input<typeof CreateShareLinkInput>;

export type ShareLinkDto = {
  id: string;
  label: string;
  allow_tasks: boolean;
  status: "active" | "expired" | "revoked";
  created_at: string;
  created_by: string | null;
  expires_at: string | null;
  last_accessed_at: string | null;
  revoked_at: string | null;
};

/** The raw token exists only in this response; only its hash is stored. */
export type NewShareLink = { link: ShareLinkDto; url: string };

/** Same fields as a staff task edit, plus who made the change (shown in Activity). No delete. */
export const SharedTaskInput = TaskInput.extend({
  by_name: z.string().trim().min(1, "Add your name.").max(80),
});
export type SharedTaskInput = z.input<typeof SharedTaskInput>;

export type SharedTask = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
};

export type SharedProject = {
  label: string;
  allow_tasks: boolean;
  company: { name: string; phone: string | null; email: string | null; logo_url: string | null };
  project: {
    project_number: string;
    name: string;
    status: ProjectStatus;
    planned_start_date: string | null;
    planned_end_date: string | null;
    site: string;
    customer: string;
  };
  progress: { total: number; done: number };
  schedule: ProjectEventDto[];
  tasks: SharedTask[];
  expires_at: string | null;
};
