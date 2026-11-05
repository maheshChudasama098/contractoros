import { z } from "zod";
import { PaginationQuery } from "./pagination";
import type { ItemType } from "./estimates";
import type { Party } from "./invoices";

// Proposals (an issued estimate version sent to the customer) and contracts
// (the agreement the customer signs in-app). Shared by /api/v1/{proposals,contracts,portal}.

export const PROPOSAL_STATUS_LABELS = {
  draft: "Draft",
  sent: "Sent",
  accepted: "Accepted",
  declined: "Declined",
  expired: "Expired",
  withdrawn: "Withdrawn",
} as const;
export type ProposalStatus = keyof typeof PROPOSAL_STATUS_LABELS;

export const CONTRACT_STATUS_LABELS = {
  draft: "Draft",
  pending_signature: "Awaiting signature",
  signed: "Signed",
  voided: "Voided",
} as const;
export type ContractStatus = keyof typeof CONTRACT_STATUS_LABELS;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => v || null);

// ---------------------------------------------------------------- contractor side

export const SendProposalInput = z.object({
  message: optionalText(2000),
  expires_in_days: z.coerce.number().int().min(1).max(180).default(30),
});
export type SendProposalInput = z.input<typeof SendProposalInput>;

export const ReasonInput = z.object({ reason: z.string().trim().min(3, "Give a short reason.").max(255) });

export const PROPOSAL_TABS = ["open", "accepted", "declined", "closed", "all"] as const;
export type ProposalTab = (typeof PROPOSAL_TABS)[number];
export const ProposalListQuery = PaginationQuery.extend({
  q: z.string().trim().max(100).optional(),
  tab: z.enum(PROPOSAL_TABS).default("all"),
});
export type ProposalListQuery = z.input<typeof ProposalListQuery>;

export type ProposalListItem = {
  id: string;
  proposal_number: string;
  status: ProposalStatus;
  estimate: { id: string; estimate_number: string; version_number: number; title: string };
  customer: { id: string; display_name: string };
  total: string;
  sent_at: string | null;
  expires_at: string | null;
  viewed_at: string | null;
  accepted_at: string | null;
  contract_id: string | null;
};

/** Returned once, when a link is created or renewed. The raw token is never stored. */
export type ProposalLink = { proposal: ProposalListItem; url: string };

export const ContractInput = z.object({
  title: z.string().trim().min(1, "Give the contract a title.").max(180),
  body: z.string().trim().min(20, "Add the agreement text.").max(50_000),
  signer_name: z.string().trim().min(1, "Who signs for the customer?").max(160),
  signer_email: z.string().trim().email("Enter the signer's email.").max(254),
});
export type ContractInput = z.input<typeof ContractInput>;

export const SendForSignatureInput = z.object({ expires_in_days: z.coerce.number().int().min(1).max(60).default(14) });

export const CreateProjectFromContractInput = z.object({
  name: z.string().trim().min(1, "Project name is required.").max(180),
  site_address_line1: z.string().trim().min(1, "Job site address is required.").max(180),
  site_address_line2: optionalText(180),
  site_city: z.string().trim().min(1, "City is required.").max(100),
  site_state: z.string().trim().min(1, "State is required.").max(80),
  site_postal_code: z.string().trim().min(1, "ZIP code is required.").max(20),
  planned_start_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .or(z.literal(""))
    .nullish()
    .transform((v) => v || null),
});
export type CreateProjectFromContractInput = z.input<typeof CreateProjectFromContractInput>;

export const CONTRACT_TABS = ["draft", "pending_signature", "signed", "voided", "all"] as const;
export type ContractTab = (typeof CONTRACT_TABS)[number];
export const ContractListQuery = PaginationQuery.extend({
  q: z.string().trim().max(100).optional(),
  tab: z.enum(CONTRACT_TABS).default("all"),
});
export type ContractListQuery = z.input<typeof ContractListQuery>;

export type ContractListItem = {
  id: string;
  contract_number: string;
  title: string;
  status: ContractStatus;
  customer: { id: string; display_name: string };
  project: { id: string; project_number: string; name: string } | null;
  contract_value: string;
  sent_at: string | null;
  signed_at: string | null;
  created_at: string;
};

/** What the customer sees and signs; frozen (and hashed) when sent for signature. */
export type ContractDocument = {
  contract_number: string;
  title: string;
  from: Party;
  customer: Party;
  estimate: { estimate_number: string; version_number: number; title: string; scope_description: string | null };
  items: { item_type: ItemType; name: string; description: string | null; quantity: string; unit: string; unit_price: string; line_subtotal: string }[];
  subtotal: string;
  discount_total: string;
  tax_rate: string;
  tax_total: string;
  total: string;
  body: string;
};

export type SignatureEvidence = {
  signed_name: string;
  signer_email: string;
  signature_type: "typed" | "drawn";
  signature_image: string | null;
  signed_at: string;
  ip: string | null;
  user_agent: string | null;
  document_hash: string;
};

export type ContractDetail = ContractListItem & {
  body: string;
  signer: { name: string; email: string } | null;
  proposal: { id: string; proposal_number: string } | null;
  estimate: { id: string; estimate_number: string; version_number: number } | null;
  document: ContractDocument;
  document_hash: string | null;
  void_reason: string | null;
  voided_at: string | null;
  signature: SignatureEvidence | null;
  events: { type: string; at: string; detail: string | null }[];
  site_suggestion: { address_line1: string; address_line2: string | null; city: string; state: string; postal_code: string } | null;
  can: { edit: boolean; send: boolean; void: boolean; create_project: boolean };
};

export type SignatureLink = { contract: ContractDetail; url: string };

// ---------------------------------------------------------------- customer (public token) side

export const AcceptProposalInput = z.object({
  name: z.string().trim().min(2, "Type your full name.").max(160),
  email: z.string().trim().email("Enter your email.").max(254),
  agree: z.literal(true, { errorMap: () => ({ message: "Please confirm you accept this proposal." }) }),
});
export type AcceptProposalInput = z.input<typeof AcceptProposalInput>;

export const DeclineInput = z.object({ reason: optionalText(500) });

export const SignContractInput = z
  .object({
    signed_name: z.string().trim().min(2, "Type your full legal name.").max(160),
    signature_type: z.enum(["typed", "drawn"]),
    // PNG data URL from the signature pad (≈ up to 150 KB).
    signature_image: z
      .string()
      .max(200_000, "Signature image is too large.")
      .regex(/^data:image\/png;base64,[A-Za-z0-9+/=]+$/, "Invalid signature image.")
      .nullish()
      .transform((v) => v || null),
    document_hash: z.string().regex(/^[0-9a-f]{64}$/),
    consent: z.literal(true, { errorMap: () => ({ message: "Please agree to sign electronically." }) }),
  })
  .refine((v) => v.signature_type === "typed" || !!v.signature_image, {
    path: ["signature_image"],
    message: "Draw your signature.",
  });
export type SignContractInput = z.input<typeof SignContractInput>;

export type PortalProposal = {
  status: ProposalStatus;
  proposal_number: string;
  from: Party & { has_logo: boolean; logo_url: string | null };
  customer: Party;
  message: string | null;
  estimate: {
    estimate_number: string;
    version_number: number;
    title: string;
    scope_description: string | null;
    customer_notes: string | null;
    terms: string | null;
  };
  items: ContractDocument["items"];
  subtotal: string;
  discount_total: string;
  tax_rate: string;
  tax_total: string;
  total: string;
  sent_at: string | null;
  expires_at: string | null;
  accepted_at: string | null;
  accepted_by_name: string | null;
  declined_at: string | null;
};

export type PortalSignature = {
  status: "pending" | "signed" | "declined" | "expired" | "voided";
  signer_name: string;
  signer_email: string;
  from: Party & { logo_url: string | null };
  document: ContractDocument;
  document_hash: string;
  signed: { signed_name: string; signed_at: string; signature_type: "typed" | "drawn"; signature_image: string | null } | null;
  expires_at: string | null;
};

export const CONSENT_TEXT =
  "I agree to sign this contract electronically. My electronic signature is the legal equivalent of my handwritten signature.";

export const DEFAULT_CONTRACT_BODY = `1. Scope of work. The contractor will perform the work described in the estimate above, using good workmanship and in line with applicable codes.

2. Price and payment. The customer agrees to pay the contract price shown above. Deposits, progress and final payments are invoiced as the work proceeds and are due by the date on each invoice.

3. Changes. Any change to the scope, price or schedule must be agreed in a written change order before the changed work starts.

4. Schedule. Start and completion dates are estimates and may move because of weather, material availability, permits or other conditions outside the contractor's control.

5. Permits and access. The contractor obtains the permits listed in the scope. The customer provides reasonable access to the property, water and electricity during working hours.

6. Warranty. The contractor warrants its workmanship for one (1) year from completion. Manufacturer warranties apply to materials and products.

7. Cancellation. The customer may cancel within three (3) business days of signing by written notice. After that, work completed and materials ordered are payable.

8. Entire agreement. This contract, the attached estimate and any signed change orders are the entire agreement between the parties.`;
