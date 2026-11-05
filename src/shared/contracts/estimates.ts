import { z } from "zod";
import { PaginationQuery } from "./pagination";
import type { Party } from "./invoices";

// Estimate contracts (/api/v1/estimates). An estimate has numbered versions; an issued
// version is immutable and changes go into a new version. Money is decimal strings.

export const ESTIMATE_STATUSES = ["draft", "issued", "accepted", "declined", "expired", "superseded"] as const;
export type EstimateStatus = (typeof ESTIMATE_STATUSES)[number];
export const ESTIMATE_STATUS_LABELS: Record<EstimateStatus, string> = {
  draft: "Draft",
  issued: "Issued",
  accepted: "Accepted",
  declined: "Declined",
  expired: "Expired",
  superseded: "Superseded",
};

export const ITEM_TYPES = ["labor", "material", "service", "allowance", "other"] as const;
export type ItemType = (typeof ITEM_TYPES)[number];
export const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  labor: "Labor",
  material: "Material",
  service: "Service",
  allowance: "Allowance",
  other: "Other",
};

const amount = z
  .string()
  .trim()
  .regex(/^\d{1,10}(\.\d{1,2})?$/, "Use a number like 250 or 250.50.");
const optionalAmount = amount
  .or(z.literal(""))
  .nullish()
  .transform((v) => v || null);
const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.");
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => v || null);

export const EstimateItemInput = z.object({
  item_type: z.enum(ITEM_TYPES).default("service"),
  name: z.string().trim().min(1, "Name the line item.").max(180),
  description: optionalText(2000),
  quantity: z
    .string()
    .trim()
    .regex(/^\d{1,8}(\.\d{1,3})?$/, "Enter a quantity like 1 or 2.5.")
    .refine((v) => Number(v) > 0, "Quantity must be more than 0."),
  unit: z
    .string()
    .trim()
    .max(30)
    .default("ea")
    .transform((v) => v || "ea"),
  unit_price: amount,
  taxable: z.boolean().default(true),
  /** Your cost per unit. Never shown to customers; ignored without the internal-cost permission. */
  internal_unit_cost: optionalAmount,
});
export type EstimateItemInput = z.input<typeof EstimateItemInput>;

export const EstimateInput = z.object({
  customer_id: z.string().uuid("Choose a customer."),
  project_id: z
    .string()
    .uuid()
    .or(z.literal(""))
    .nullish()
    .transform((v) => v || null),
  title: z.string().trim().min(1, "Give the estimate a title.").max(180),
  scope_description: optionalText(5000),
  valid_until: ymd.or(z.literal("")).nullish().transform((v) => v || null),
  tax_rate: z
    .string()
    .trim()
    .regex(/^\d{1,2}(\.\d{1,3})?$|^100(\.0{1,3})?$/, "Enter a tax rate like 8.25.")
    .default("0"),
  discount: amount.default("0"),
  customer_notes: optionalText(2000),
  terms: optionalText(5000),
  items: z.array(EstimateItemInput).min(1, "Add at least one line item.").max(200, "Up to 200 line items."),
});
export type EstimateInput = z.input<typeof EstimateInput>;
export type EstimateData = z.output<typeof EstimateInput>;

export const ESTIMATE_TABS = ["open", "draft", "issued", "accepted", "declined", "all"] as const;
export type EstimateTab = (typeof ESTIMATE_TABS)[number];
export const ESTIMATE_SORTS = ["estimate_number", "customer", "total", "created_at", "valid_until"] as const;
export type EstimateSort = (typeof ESTIMATE_SORTS)[number];

export const EstimateListQuery = PaginationQuery.extend({
  q: z.string().trim().max(100).optional(),
  tab: z.enum(ESTIMATE_TABS).default("all"),
  customer_id: z.string().uuid().optional(),
  sort: z.enum(ESTIMATE_SORTS).default("created_at"),
  dir: z.enum(["asc", "desc"]).default("desc"),
});
export type EstimateListQuery = z.input<typeof EstimateListQuery>;

export type EstimateListItem = {
  id: string;
  estimate_number: string;
  title: string;
  status: EstimateStatus;
  customer: { id: string; display_name: string };
  project: { id: string; project_number: string; name: string } | null;
  version_number: number;
  has_draft: boolean;
  total: string;
  valid_until: string | null;
  created_at: string;
};

export type EstimateListPage = {
  items: EstimateListItem[];
  page: number;
  per_page: number;
  total: number;
  counts: Record<EstimateTab, number>;
  summary: { open_value: string; accepted_value_90d: string; win_rate_90d: number | null };
  can_write: boolean;
  can_view_cost: boolean;
};

export type EstimateItemDto = {
  id: string;
  item_type: ItemType;
  name: string;
  description: string | null;
  quantity: string;
  unit: string;
  unit_price: string;
  line_subtotal: string;
  taxable: boolean;
  tax_amount: string;
  /** Present only with the internal-cost permission. */
  internal_unit_cost?: string | null;
  internal_line_cost?: string | null;
};

export type EstimateVersionDto = {
  id: string;
  version_number: number;
  title: string;
  scope_description: string | null;
  subtotal: string;
  discount_total: string;
  tax_rate: string;
  tax_total: string;
  total: string;
  customer_notes: string | null;
  terms: string | null;
  valid_until: string | null;
  issued_at: string | null;
  created_at: string;
  items: EstimateItemDto[];
  /** Present only with the internal-cost permission. */
  internal?: { cost_total: string; margin: string; margin_pct: number | null } | null;
};

export type ProposalSummary = {
  id: string;
  proposal_number: string;
  status: "draft" | "sent" | "accepted" | "declined" | "expired" | "withdrawn";
  version_number: number;
  sent_at: string | null;
  expires_at: string | null;
  viewed_at: string | null;
  accepted_at: string | null;
  accepted_by_name: string | null;
  declined_at: string | null;
  decline_reason: string | null;
  contract_id: string | null;
};

export type EstimateDetail = EstimateListItem & {
  versions: { id: string; version_number: number; issued_at: string | null; total: string }[];
  version: EstimateVersionDto;
  proposals: ProposalSummary[];
  bill_to: Party;
  from: Party & { has_logo: boolean };
  can: {
    edit: boolean;
    issue: boolean;
    revise: boolean;
    send_proposal: boolean;
    delete: boolean;
    view_internal_cost: boolean;
  };
};
