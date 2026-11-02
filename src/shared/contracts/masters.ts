import { z } from "zod";

// Master data (platform-wide lookups managed by super admins). Shared by /api/v1/masters, /api/v1/admin/masters and the UI.

export const MASTER_TYPES = {
  industry: {
    label: "Industries",
    singular: "Industry",
    hasCode: false,
  },
  company_size: {
    label: "Company sizes",
    singular: "Company size",
    hasCode: true,
    codeHint: "Stored on companies, e.g. 2_5. Can't change once in use.",
  },
  time_zone: {
    label: "Time zones",
    singular: "Time zone",
    hasCode: true,
    codeHint: "IANA name, e.g. America/Chicago. Can't change once in use.",
  },
  expense_category: {
    label: "Expense categories",
    singular: "Expense category",
    hasCode: true,
    codeHint: "Stored on expenses, e.g. materials. Can't change once in use.",
  },
  payment_method: {
    label: "Payment methods",
    singular: "Payment method",
    hasCode: true,
    codeHint: "Stored on expenses, e.g. card. Can't change once in use.",
  },
} as const;

export type MasterType = keyof typeof MASTER_TYPES;
export const MASTER_TYPE_KEYS = Object.keys(MASTER_TYPES) as [MasterType, ...MasterType[]];
export const MasterTypeParam = z.enum(MASTER_TYPE_KEYS);

export type MasterItemDto = {
  id: string;
  /** What other records store: the code for code-based masters, the id for industries. */
  value: string;
  code: string | null;
  name: string;
  sort_order: number;
  is_active: boolean;
  in_use: number; // records referencing this item (companies or expenses)
};

export const MasterItemInput = z.object({
  code: z
    .string()
    .trim()
    .max(64)
    .regex(/^[A-Za-z0-9_/+-]+$/, "Use letters, numbers, _ / + or -.")
    .optional(),
  name: z.string().trim().min(1, "Name is required.").max(120),
  sort_order: z.coerce.number().int().min(0).max(100000).default(0),
  is_active: z.boolean().default(true),
});
export type MasterItemInput = z.input<typeof MasterItemInput>;
export const UpdateMasterItemInput = MasterItemInput.partial();
export type UpdateMasterItemInput = z.input<typeof UpdateMasterItemInput>;

/** Public option for menus. */
export type MasterOption = { value: string; label: string };
