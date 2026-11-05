import { z } from "zod";

// Auth management (users & roles). Shared by /api/v1/users, /api/v1/roles and the web UI.

/** Human labels for the permission catalog, grouped for the role editor. */
export const PERMISSION_GROUPS: { group: string; items: { key: string; label: string }[] }[] = [
  {
    group: "Organization",
    items: [
      { key: "org.manage", label: "Manage company settings" },
      { key: "team.manage", label: "Manage users & roles" },
      { key: "billing.manage", label: "Manage billing & plan" },
      { key: "integration.manage", label: "Manage integrations" },
      { key: "audit.read", label: "View audit log" },
    ],
  },
  {
    group: "Sales",
    items: [
      { key: "lead.read", label: "View leads" },
      { key: "lead.write", label: "Create & edit leads" },
      { key: "customer.read", label: "View customers" },
      { key: "customer.write", label: "Create & edit customers" },
      { key: "estimate.read", label: "View estimates" },
      { key: "estimate.write", label: "Create & edit estimates" },
      { key: "estimate.issue", label: "Issue estimates" },
      { key: "estimate.view_internal_cost", label: "View internal cost & margin" },
      { key: "contract.void", label: "Void contracts" },
    ],
  },
  {
    group: "Delivery",
    items: [
      { key: "project.read", label: "View projects" },
      { key: "project.write", label: "Create & edit projects" },
      { key: "file.read", label: "View company files" },
      { key: "file.write", label: "Upload & organize files" },
      { key: "change_order.write", label: "Create change orders" },
      { key: "change_order.approve", label: "Approve change orders" },
    ],
  },
  {
    group: "Finance",
    items: [
      { key: "invoice.read", label: "View invoices" },
      { key: "invoice.issue", label: "Issue invoices" },
      { key: "invoice.void", label: "Void invoices" },
      { key: "payment.refund", label: "Refund payments" },
      { key: "report.read", label: "View reports" },
    ],
  },
];

export type PermissionDto = { key: string; label: string; group: string };

export type RoleDto = {
  id: string;
  key: string;
  name: string;
  system: boolean; // system roles are shared by every company and are read-only
  permissions: string[];
  member_count: number;
};

const roleName = z.string().trim().min(2, "Enter a role name.").max(100);
const permissionKeys = z.array(z.string().max(80)).max(100);

export const CreateRoleInput = z.object({ name: roleName, permissions: permissionKeys.default([]) });
export type CreateRoleInput = z.infer<typeof CreateRoleInput>;

export const UpdateRoleInput = z.object({ name: roleName.optional(), permissions: permissionKeys.optional() });
export type UpdateRoleInput = z.infer<typeof UpdateRoleInput>;

export const MEMBER_STATUSES = ["active", "suspended"] as const;
export type MemberStatus = (typeof MEMBER_STATUSES)[number] | "invited";

export type MemberDto = {
  id: string; // membership id
  user_id: string;
  name: string;
  email: string;
  status: MemberStatus;
  job_title: string | null;
  role: { id: string; name: string } | null; // one role per user
  last_login_at: string | null;
  joined_at: string | null;
  is_self: boolean;
  /** Invited users only: when the latest invite link expires (null = no link sent yet). */
  invite_expires_at: string | null;
};

const roleId = z.string({ required_error: "Choose a role." }).uuid("Choose a role.");

export const CreateMemberInput = z.object({
  name: z.string().trim().min(2, "Enter the full name.").max(160),
  email: z.string().trim().toLowerCase().email().max(254),
  // Blank = "invite": the user joins as Invited and sets their own password from the invite link.
  password: z
    .string()
    .max(200)
    .optional()
    .transform((v) => v || undefined)
    .refine((v) => v === undefined || v.length >= 10, "Use at least 10 characters."),
  job_title: z.string().trim().max(100).optional(),
  role_id: roleId,
});
export type CreateMemberInput = z.infer<typeof CreateMemberInput>;

export const UpdateMemberInput = z.object({
  name: z.string().trim().min(2).max(160).optional(),
  job_title: z.string().trim().max(100).nullable().optional(),
  status: z.enum(MEMBER_STATUSES).optional(),
  role_id: roleId.optional(),
});
export type UpdateMemberInput = z.infer<typeof UpdateMemberInput>;

// ---------------------------------------------------------------- Invitations

export const INVITE_TTL_DAYS = 7;

export type InvitationDto = {
  id: string;
  email: string;
  role: { id: string; name: string } | null;
  invited_by: string | null;
  expires_at: string;
  expired: boolean;
  created_at: string;
};

/** Returned once on create/resend: the raw link is never stored, only its hash. */
export type InvitationWithLink = InvitationDto & { invite_url: string };

/** Public preview shown on /invite/[token] before the person accepts. */
export type InvitationPreview = {
  email: string;
  organization_name: string;
  role_name: string | null;
  invited_by: string | null;
  expires_at: string;
  account_exists: boolean; // existing users confirm with their password instead of creating one
};

export const AcceptInvitationInput = z.object({
  token: z.string().min(20).max(200),
  name: z.string().trim().max(160).optional(),
  password: z.string().min(1, "Enter a password.").max(128),
});
export type AcceptInvitationInput = z.infer<typeof AcceptInvitationInput>;
