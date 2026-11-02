// Permission catalog (spec §3). Seeded into the `permissions` table.
export const PERMISSIONS = [
  "org.manage",
  "team.manage",
  "billing.manage",
  "lead.read",
  "lead.write",
  "customer.read",
  "customer.write",
  "estimate.read",
  "estimate.write",
  "estimate.issue",
  "estimate.view_internal_cost",
  "project.read",
  "project.write",
  "change_order.write",
  "change_order.approve",
  "invoice.read",
  "invoice.issue",
  "invoice.void",
  "payment.refund",
  "integration.manage",
  "report.read",
  "audit.read",
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number];

// Starter system roles (COS-008). Org-defined roles can be added later.
export const SYSTEM_ROLES: Record<string, readonly PermissionKey[]> = {
  owner: PERMISSIONS,
  admin: PERMISSIONS.filter((p) => p !== "billing.manage"),
  sales: ["lead.read", "lead.write", "customer.read", "customer.write", "estimate.read", "estimate.write"],
  estimator: ["customer.read", "estimate.read", "estimate.write", "estimate.issue", "estimate.view_internal_cost"],
  project_manager: ["customer.read", "project.read", "project.write", "change_order.write"],
  field_worker: ["project.read"],
  accountant: ["customer.read", "invoice.read", "invoice.issue", "invoice.void", "payment.refund", "integration.manage", "report.read"],
};
