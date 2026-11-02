// Spec §8 status / type values. Stored as VARCHAR and enforced via Sequelize `isIn` validation,
// so adding a value never needs a Postgres ENUM migration.

export const OrganizationStatus = ["trial", "active", "suspended", "cancelled"] as const;
export const UserStatus = ["active", "disabled", "pending"] as const;
export const MembershipStatus = ["invited", "active", "suspended", "removed"] as const;
export const SubscriptionStatus = ["trialing", "active", "past_due", "cancelled", "unpaid"] as const;

export const LeadStage = ["new", "contacted", "qualified", "estimate", "won", "lost"] as const;
export const CustomerType = ["individual", "company"] as const;
export const CustomerStatus = ["active", "archived"] as const;
export const ActivitySubjectType = [
  "lead",
  "customer",
  "project",
  "estimate",
  "proposal",
  "contract",
  "invoice",
] as const;
export const ActivityType = ["note", "call", "email", "meeting", "status_change"] as const;

export const EstimateStatus = ["draft", "issued", "accepted", "declined", "expired", "superseded"] as const;
export const EstimateItemType = ["labor", "material", "service", "allowance", "other"] as const;
export const ProposalStatus = ["draft", "sent", "accepted", "declined", "expired", "withdrawn"] as const;
export const ContractStatus = ["draft", "pending_signature", "signed", "voided"] as const;
export const SignatureRequestStatus = ["created", "sent", "viewed", "signed", "declined", "expired", "failed"] as const;
export const SignatureEventType = ["sent", "viewed", "signed", "declined", "expired", "failed"] as const;

export const ProjectStatus = ["planned", "scheduled", "active", "on_hold", "completed", "cancelled"] as const;
export const Priority = ["low", "normal", "high", "urgent"] as const;
export const ProjectRole = ["manager", "estimator", "field", "other"] as const;
export const TaskStatus = ["todo", "in_progress", "blocked", "done", "cancelled"] as const;
export const MilestoneStatus = ["upcoming", "in_progress", "completed", "delayed", "cancelled"] as const;
export const ScheduleAssignmentStatus = ["scheduled", "confirmed", "completed", "cancelled"] as const;

export const ChangeOrderStatus = ["draft", "issued", "approved", "declined", "voided"] as const;
export const InvoiceStatus = ["draft", "issued", "partially_paid", "paid", "overdue", "void"] as const;
export const InvoiceType = ["deposit", "progress", "final", "standard", "credit"] as const;
export const PaymentScheduleStatus = ["planned", "invoiced", "paid", "cancelled"] as const;
export const PaymentProvider = ["stripe"] as const;
export const PaymentStatus = [
  "initiated",
  "pending",
  "succeeded",
  "failed",
  "cancelled",
  "refunded",
  "partially_refunded",
] as const;
export const RefundStatus = ["requested", "pending", "succeeded", "failed"] as const;

export const WebhookProvider = ["stripe", "quickbooks", "esign"] as const;
export const WebhookEventStatus = ["received", "processing", "processed", "failed", "ignored"] as const;

export const StorageProvider = ["s3"] as const;
export const FileScanStatus = ["pending", "clean", "infected", "not_required"] as const;
export const FileStatus = ["pending", "available", "quarantined", "deleted"] as const;
export const DocumentEntityType = [
  "project",
  "invoice",
  "contract",
  "estimate",
  "proposal",
  "change_order",
  "customer",
] as const;
export const DocumentType = [
  "progress_photo",
  "signed_contract",
  "contract_pdf",
  "invoice_pdf",
  "estimate_pdf",
  "proposal_pdf",
  "change_order_pdf",
  "other",
] as const;
export const DocumentVisibility = ["internal", "customer", "specific_customer"] as const;

export const IntegrationProvider = ["quickbooks", "stripe", "esign"] as const;
export const IntegrationStatus = ["connected", "needs_reauth", "disconnected", "error"] as const;
export const SyncStatus = ["pending", "synced", "error", "conflict"] as const;
export const SyncOperation = ["create", "update", "fetch", "reconcile"] as const;
export const SyncLogStatus = ["queued", "running", "succeeded", "failed", "retrying"] as const;

export const ActorType = ["user", "customer", "system", "provider"] as const;
export const NotificationChannel = ["email", "sms", "in_app"] as const;
export const NotificationStatus = ["queued", "sent", "delivered", "failed", "cancelled"] as const;
export const PortalEventType = ["viewed", "file_downloaded", "verification_sent", "action_attempted"] as const;

export const ErrorLogSource = ["api", "server", "worker"] as const;
export const OtpPurpose = ["password_reset", "email_verify"] as const;
export const LoginMethod = ["password", "magic_link", "oauth", "invite"] as const;

export type ValuesOf<T extends readonly string[]> = T[number];
