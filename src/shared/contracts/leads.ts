import { z } from "zod";
import { PaginationQuery } from "./pagination";

export const LEAD_STAGES = ["new", "contacted", "qualified", "estimate", "won", "lost"] as const;
export type LeadStage = (typeof LEAD_STAGES)[number];

// Note: `stage` is intentionally not writable here; use domain commands for transitions.
export const CreateLeadInput = z.object({
  first_name: z.string().trim().max(100).optional(),
  last_name: z.string().trim().max(100).optional(),
  company_name: z.string().trim().max(160).optional(),
  email: z.string().trim().email().max(254).optional(),
  phone: z.string().trim().max(32).optional(),
  estimated_value: z.string().regex(/^\d{1,10}(\.\d{1,2})?$/, "Use a decimal amount like 1250.00").optional(),
  next_follow_up_at: z.string().datetime().optional(),
  notes: z.string().max(10_000).optional(),
});
export type CreateLeadInput = z.infer<typeof CreateLeadInput>;

export const ListLeadsQuery = PaginationQuery.extend({
  stage: z.enum(LEAD_STAGES).optional(),
});
export type ListLeadsQuery = z.infer<typeof ListLeadsQuery>;

export type LeadDto = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  stage: LeadStage;
  estimated_value: string | null; // money as decimal string, never float
  currency: string;
  next_follow_up_at: string | null;
  created_at: string;
};
