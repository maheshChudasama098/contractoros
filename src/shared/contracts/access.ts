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
    ],
  },
  {
    group: "Delivery",
    items: [
      { key: "project.read", label: "View projects" },
      { key: "project.write", label: "Create & edit projects" },
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
};

const roleId = z.string({ required_error: "Choose a role." }).uuid("Choose a role.");

export const CreateMemberInput = z.object({
  name: z.string().trim().min(2, "Enter the full name.").max(160),
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(10, "Use at least 10 characters.").max(200),
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
