import type { ModelStatic, Model } from "sequelize";
import { sequelize } from "../sequelize";
import * as I from "./identity";
import * as C from "./crm";
import * as S from "./sales";
import * as P from "./projects";
import * as B from "./billing";
import * as X from "./platform";

// Spec §9 relationships. Default RESTRICT: never cascade org deletes into financial/audit data.
// `constraints: false` breaks circular FKs (sync cannot order them); enforce those in services.
type M = ModelStatic<Model>;
function ref(
  child: M,
  parent: M,
  foreignKey: string,
  as: string,
  opts: { onDelete?: string; inverse?: string; constraints?: boolean } = {},
) {
  // Sequelize adds an FK whenever onDelete is set, so omit it for unconstrained links.
  const fkRules =
    opts.constraints === false
      ? { constraints: false }
      : { onDelete: opts.onDelete ?? "RESTRICT", onUpdate: "CASCADE" };
  child.belongsTo(parent, { foreignKey, as, ...fkRules });
  if (opts.inverse) parent.hasMany(child, { foreignKey, as: opts.inverse });
}

// Tenant scoping for every org-owned table.
const orgOwned: M[] = [
  I.OrganizationMembership,
  I.Invitation,
  I.Subscription,
  C.LeadSource,
  C.Lead,
  C.Customer,
  C.Property,
  C.PropertyContact,
  C.Activity,
  S.Estimate,
  S.EstimateVersion,
  S.EstimateItem,
  S.Proposal,
  S.Contract,
  S.SignatureRequest,
  S.SignatureEvent,
  P.Project,
  P.ProjectMember,
  P.ProjectTask,
  P.Milestone,
  P.Crew,
  P.ScheduleAssignment,
  B.ChangeOrder,
  B.ChangeOrderItem,
  B.Invoice,
  B.InvoiceItem,
  B.PaymentSchedule,
  B.Payment,
  B.Refund,
  X.StoredFile,
  X.DocumentLink,
  X.IntegrationConnection,
  X.ExternalIdMapping,
  X.SyncLog,
  X.IdempotencyKey,
  X.AuditLog,
  X.Notification,
  X.CustomerPortalLink,
  X.CustomerPortalEvent,
];
for (const model of orgOwned) ref(model, I.Organization, "organizationId", "organization");
I.Organization.hasMany(I.OrganizationMembership, { foreignKey: "organizationId", as: "memberships" });
I.Role.belongsTo(I.Organization, { foreignKey: "organizationId", as: "organization", onDelete: "RESTRICT" });

// Identity & RBAC
ref(I.OrganizationMembership, I.User, "userId", "user", { inverse: "memberships" });
ref(I.User, X.StoredFile, "avatarFileId", "avatarFile", { constraints: false });
I.Role.belongsToMany(I.Permission, {
  through: I.RolePermission,
  foreignKey: "roleId",
  otherKey: "permissionId",
  as: "permissions",
});
I.Permission.belongsToMany(I.Role, {
  through: I.RolePermission,
  foreignKey: "permissionId",
  otherKey: "roleId",
  as: "roles",
});
I.OrganizationMembership.belongsToMany(I.Role, {
  through: I.MembershipRole,
  foreignKey: "membershipId",
  otherKey: "roleId",
  as: "roles",
});
I.Role.belongsToMany(I.OrganizationMembership, {
  through: I.MembershipRole,
  foreignKey: "roleId",
  otherKey: "membershipId",
  as: "memberships",
});
I.Invitation.belongsToMany(I.Role, {
  through: I.InvitationRole,
  foreignKey: "invitationId",
  otherKey: "roleId",
  as: "roles",
});
ref(I.Invitation, I.User, "invitedByUserId", "invitedBy");
ref(I.UserSession, I.User, "userId", "user", { onDelete: "CASCADE" });
ref(I.AuthOtp, I.User, "userId", "user", { onDelete: "CASCADE" });

// CRM
ref(C.Lead, C.LeadSource, "sourceId", "source", { onDelete: "SET NULL", inverse: "leads" });
ref(C.Lead, I.OrganizationMembership, "ownerMembershipId", "owner", { onDelete: "SET NULL" });
ref(C.Lead, C.Customer, "convertedCustomerId", "convertedCustomer", { constraints: false });
ref(C.Lead, I.User, "createdByUserId", "createdBy", { onDelete: "SET NULL" });
ref(C.Customer, C.Lead, "sourceLeadId", "sourceLead", { onDelete: "SET NULL" });
ref(C.Property, C.Customer, "customerId", "customer", { inverse: "properties" });
ref(C.PropertyContact, C.Property, "propertyId", "property", { onDelete: "CASCADE", inverse: "contacts" });
ref(C.PropertyContact, C.Customer, "customerId", "customer");
ref(C.Activity, I.User, "createdByUserId", "createdBy", { onDelete: "SET NULL" });

// Estimates, proposals, contracts
ref(S.Estimate, C.Customer, "customerId", "customer", { inverse: "estimates" });
ref(S.Estimate, C.Property, "propertyId", "property");
ref(S.Estimate, P.Project, "projectId", "project", { constraints: false });
ref(S.Estimate, I.User, "createdByUserId", "createdBy");
ref(S.EstimateVersion, S.Estimate, "estimateId", "estimate", { inverse: "versions" });
S.Estimate.belongsTo(S.EstimateVersion, { foreignKey: "currentVersionId", as: "currentVersion", constraints: false });
ref(S.EstimateVersion, I.User, "createdByUserId", "createdBy");
ref(S.EstimateItem, S.EstimateVersion, "estimateVersionId", "version", { inverse: "items" });
ref(S.Proposal, S.Estimate, "estimateId", "estimate", { inverse: "proposals" });
ref(S.Proposal, S.EstimateVersion, "estimateVersionId", "estimateVersion");
ref(S.Proposal, C.Customer, "customerId", "customer");
ref(S.Proposal, I.User, "createdByUserId", "createdBy");
ref(S.Contract, S.Proposal, "proposalId", "proposal");
ref(S.Contract, S.EstimateVersion, "estimateVersionId", "estimateVersion");
ref(S.Contract, C.Customer, "customerId", "customer");
ref(S.Contract, P.Project, "projectId", "project");
ref(S.Contract, X.StoredFile, "documentFileId", "documentFile");
ref(S.Contract, X.StoredFile, "signedDocumentFileId", "signedDocumentFile");
ref(S.Contract, I.User, "createdByUserId", "createdBy");
ref(S.SignatureRequest, S.Contract, "contractId", "contract", { inverse: "signatureRequests" });
ref(S.SignatureEvent, S.SignatureRequest, "requestId", "request", { inverse: "events" });

// Projects & scheduling
ref(P.Project, C.Customer, "customerId", "customer", { inverse: "projects" });
ref(P.Project, C.Property, "propertyId", "property", { inverse: "projects" });
// Project <-> Contract is circular; keep this side unconstrained so sync order works.
P.Project.belongsTo(S.Contract, { foreignKey: "contractId", as: "contract", constraints: false });
ref(P.Project, S.Estimate, "sourceEstimateId", "sourceEstimate", { onDelete: "SET NULL" });
ref(P.Project, I.User, "createdByUserId", "createdBy");
ref(P.ProjectMember, P.Project, "projectId", "project", { onDelete: "CASCADE", inverse: "members" });
ref(P.ProjectMember, I.OrganizationMembership, "membershipId", "membership");
ref(P.ProjectTask, P.Project, "projectId", "project", { inverse: "tasks" });
ref(P.ProjectTask, P.ProjectTask, "parentTaskId", "parentTask", { onDelete: "CASCADE", inverse: "subtasks" });
ref(P.ProjectTask, I.OrganizationMembership, "assigneeMembershipId", "assignee", { onDelete: "SET NULL" });
ref(P.ProjectTask, I.User, "createdByUserId", "createdBy");
ref(P.Milestone, P.Project, "projectId", "project", { inverse: "milestones" });
ref(P.CrewMember, P.Crew, "crewId", "crew", { onDelete: "CASCADE", inverse: "members" });
ref(P.CrewMember, I.OrganizationMembership, "membershipId", "membership");
ref(P.ScheduleAssignment, P.Project, "projectId", "project", { inverse: "scheduleAssignments" });
ref(P.ScheduleAssignment, P.ProjectTask, "taskId", "task", { onDelete: "SET NULL" });
ref(P.ScheduleAssignment, I.OrganizationMembership, "membershipId", "membership", { onDelete: "SET NULL" });
ref(P.ScheduleAssignment, P.Crew, "crewId", "crew", { onDelete: "SET NULL" });

// Change orders, invoices, payments
ref(B.ChangeOrder, P.Project, "projectId", "project", { inverse: "changeOrders" });
ref(B.ChangeOrder, S.SignatureRequest, "signatureRequestId", "signatureRequest");
ref(B.ChangeOrder, I.User, "createdByUserId", "createdBy");
ref(B.ChangeOrderItem, B.ChangeOrder, "changeOrderId", "changeOrder", { inverse: "items" });
ref(B.Invoice, C.Customer, "customerId", "customer", { inverse: "invoices" });
ref(B.Invoice, P.Project, "projectId", "project", { inverse: "invoices" });
ref(B.Invoice, S.Contract, "contractId", "contract");
ref(B.Invoice, I.User, "createdByUserId", "createdBy");
ref(B.InvoiceItem, B.Invoice, "invoiceId", "invoice", { inverse: "items" });
ref(B.PaymentSchedule, P.Project, "projectId", "project", { inverse: "paymentSchedules" });
ref(B.PaymentSchedule, S.Contract, "contractId", "contract");
ref(B.PaymentSchedule, B.Invoice, "invoiceId", "invoice", { onDelete: "SET NULL" });
ref(B.Payment, B.Invoice, "invoiceId", "invoice", { inverse: "payments" });
ref(B.Payment, C.Customer, "customerId", "customer");
ref(B.Refund, B.Payment, "paymentId", "payment", { inverse: "refunds" });
ref(B.Refund, I.User, "requestedByUserId", "requestedBy");

// Files, integrations, notifications, portal
ref(X.StoredFile, I.User, "uploadedByUserId", "uploadedBy", { onDelete: "SET NULL" });
ref(X.DocumentLink, X.StoredFile, "fileId", "file", { inverse: "links" });
ref(X.IntegrationConnection, I.User, "connectedByUserId", "connectedBy", { onDelete: "SET NULL" });
ref(X.AuditLog, I.User, "actorUserId", "actor", { onDelete: "SET NULL" });
ref(X.Notification, I.User, "recipientUserId", "recipient", { onDelete: "SET NULL" });
ref(X.CustomerPortalLink, P.Project, "projectId", "project", { inverse: "portalLinks" });
ref(X.CustomerPortalLink, C.Customer, "customerId", "customer");
ref(X.CustomerPortalLink, I.User, "createdByUserId", "createdBy");
ref(X.CustomerPortalEvent, X.CustomerPortalLink, "portalLinkId", "portalLink", { inverse: "events" });
ref(X.LoginLog, I.User, "userId", "user", { onDelete: "SET NULL" });

export { sequelize };
export * from "./identity";
export * from "./crm";
export * from "./sales";
export * from "./projects";
export * from "./billing";
export * from "./platform";
