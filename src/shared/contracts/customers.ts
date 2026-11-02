import { z } from "zod";
import { PaginationQuery } from "./pagination";

// Customer contracts shared by /api/v1/customers and the web UI.

export const CUSTOMER_TYPES = ["individual", "company"] as const;
export const CUSTOMER_STATUSES = ["active", "archived"] as const;
export type CustomerType = (typeof CUSTOMER_TYPES)[number];
export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];

const opt = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => v || null);

const CustomerFields = z.object({
  customer_type: z.enum(CUSTOMER_TYPES).default("individual"),
  first_name: opt(100),
  last_name: opt(100),
  company_name: opt(160),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254)
    .email("Enter a valid email address.")
    .or(z.literal(""))
    .nullish()
    .transform((v) => v || null),
  phone: z
    .string()
    .trim()
    .regex(/^[+()\d\s.-]{7,20}$/, "Enter a valid phone number.")
    .or(z.literal(""))
    .nullish()
    .transform((v) => v || null),
  billing_address_line1: opt(180),
  billing_address_line2: opt(180),
  billing_city: opt(100),
  billing_state: opt(80),
  billing_postal_code: opt(20),
  notes: opt(5000),
  status: z.enum(CUSTOMER_STATUSES).default("active"),
});

/** A customer needs a person's name or, for companies, a company name. */
const requireName = <T extends z.infer<typeof CustomerFields>>(v: T, ctx: z.RefinementCtx) => {
  if (v.customer_type === "company" && !v.company_name)
    ctx.addIssue({ code: "custom", path: ["company_name"], message: "Company name is required." });
  if (v.customer_type === "individual" && !v.first_name && !v.last_name)
    ctx.addIssue({ code: "custom", path: ["first_name"], message: "First or last name is required." });
};

export const CustomerInput = CustomerFields.superRefine(requireName);
export type CustomerInput = z.input<typeof CustomerInput>;
export type CustomerData = z.output<typeof CustomerInput>;

export const CustomerListQuery = PaginationQuery.extend({
  q: z.string().trim().max(100).optional(),
  status: z.enum([...CUSTOMER_STATUSES, "all"]).default("active"),
});
export type CustomerListQuery = z.input<typeof CustomerListQuery>;

export type CustomerDto = {
  id: string;
  display_name: string;
  customer_type: CustomerType;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  billing_address_line1: string | null;
  billing_address_line2: string | null;
  billing_city: string | null;
  billing_state: string | null;
  billing_postal_code: string | null;
  notes: string | null;
  status: CustomerStatus;
  created_at: string;
  updated_at: string;
};
