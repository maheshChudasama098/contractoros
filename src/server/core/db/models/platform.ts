import { DataTypes } from "sequelize";
import { sequelize } from "../sequelize";
import * as E from "../enums";
import { createdOnly, enumOf, fk, inet, int, json, orgId, str, text, ts, uuidPk } from "./columns";

// M14–M17 files, integrations, webhooks, idempotency, audit, notifications, portal, logs.

export const StoredFile = sequelize.define(
  "File",
  {
    id: uuidPk(),
    organizationId: orgId(),
    storageProvider: enumOf(E.StorageProvider, "s3"),
    bucketKey: { ...str(512, false), unique: true },
    originalFilename: str(255, false),
    mimeType: str(120, false),
    sizeBytes: { type: DataTypes.BIGINT, allowNull: false },
    checksumSha256: str(64),
    uploadedByUserId: fk(true),
    scanStatus: enumOf(E.FileScanStatus, "pending"),
    status: enumOf(E.FileStatus, "pending"),
  },
  { tableName: "files", indexes: [{ fields: ["organization_id", "created_at"] }] },
);

export const DocumentLink = sequelize.define(
  "DocumentLink",
  {
    id: uuidPk(),
    organizationId: orgId(),
    fileId: fk(),
    entityType: { ...enumOf(E.DocumentEntityType), type: DataTypes.STRING(40) },
    entityId: fk(),
    documentType: { ...enumOf(E.DocumentType), type: DataTypes.STRING(40) },
    visibility: enumOf(E.DocumentVisibility, "internal"),
  },
  {
    tableName: "document_links",
    ...createdOnly,
    indexes: [{ fields: ["organization_id", "entity_type", "entity_id"] }, { fields: ["file_id"] }],
  },
);

export const IntegrationConnection = sequelize.define(
  "IntegrationConnection",
  {
    id: uuidPk(),
    organizationId: orgId(),
    provider: { ...enumOf(E.IntegrationProvider), type: DataTypes.STRING(40) },
    status: enumOf(E.IntegrationStatus, "connected"),
    externalCompanyId: str(160),
    accessTokenEncrypted: text(),
    refreshTokenEncrypted: text(),
    tokenExpiresAt: ts(),
    scopes: { type: DataTypes.ARRAY(DataTypes.TEXT), allowNull: true },
    connectedByUserId: fk(true),
  },
  {
    tableName: "integration_connections",
    createdAt: "connectedAt",
    indexes: [{ unique: true, fields: ["organization_id", "provider"] }],
  },
);

export const ExternalIdMapping = sequelize.define(
  "ExternalIdMapping",
  {
    id: uuidPk(),
    organizationId: orgId(),
    provider: { ...enumOf(E.IntegrationProvider), type: DataTypes.STRING(40) },
    entityType: str(40, false),
    internalEntityId: fk(),
    externalEntityId: str(180, false),
    lastSyncedAt: ts(),
    syncStatus: enumOf(E.SyncStatus, "pending"),
  },
  {
    tableName: "external_id_mappings",
    timestamps: false,
    // Explicit name = what Postgres stored after truncating the default to 63 chars, so sync stops re-creating it.
    indexes: [
      {
        name: "external_id_mappings_organization_id_provider_entity_type_inter",
        unique: true,
        fields: ["organization_id", "provider", "entity_type", "internal_entity_id"],
      },
    ],
  },
);

export const SyncLog = sequelize.define(
  "SyncLog",
  {
    id: uuidPk(),
    organizationId: orgId(),
    provider: { ...enumOf(E.IntegrationProvider), type: DataTypes.STRING(40) },
    entityType: str(40, false),
    entityId: fk(true),
    operation: enumOf(E.SyncOperation),
    status: enumOf(E.SyncLogStatus, "queued"),
    attemptCount: int(0),
    errorCode: str(100),
    errorMessage: text(),
    startedAt: ts(),
    finishedAt: ts(),
  },
  { tableName: "sync_logs", ...createdOnly, indexes: [{ fields: ["organization_id", "created_at"] }] },
);

// Provider webhook inbox (not tenant-scoped until processed).
export const WebhookEvent = sequelize.define(
  "WebhookEvent",
  {
    id: uuidPk(),
    provider: enumOf(E.WebhookProvider),
    providerEventId: str(180, false),
    eventType: str(120, false),
    payload: { type: DataTypes.JSONB, allowNull: false },
    status: enumOf(E.WebhookEventStatus, "received"),
    attemptCount: int(0),
    receivedAt: ts(),
    processedAt: ts(),
    lastError: text(),
  },
  {
    tableName: "webhook_events",
    timestamps: false,
    indexes: [{ unique: true, fields: ["provider", "provider_event_id"] }, { fields: ["status"] }],
  },
);

export const IdempotencyKey = sequelize.define(
  "IdempotencyKey",
  {
    id: uuidPk(),
    organizationId: orgId(),
    key: str(160, false),
    operation: str(120, false),
    requestHash: str(128, false),
    responseStatus: int(undefined, true),
    responseBody: json(true),
    expiresAt: ts(false),
  },
  {
    tableName: "idempotency_keys",
    ...createdOnly,
    indexes: [{ unique: true, fields: ["organization_id", "operation", "key"] }, { fields: ["expires_at"] }],
  },
);

// Append-only business audit trail.
export const AuditLog = sequelize.define(
  "AuditLog",
  {
    id: uuidPk(),
    organizationId: orgId(),
    actorUserId: fk(true),
    actorType: enumOf(E.ActorType),
    action: str(100, false),
    entityType: str(40, false),
    entityId: fk(),
    requestId: str(100),
    ipAddress: inet(),
    userAgent: text(),
    beforeSnapshot: json(true),
    afterSnapshot: json(true),
  },
  {
    tableName: "audit_logs",
    ...createdOnly,
    indexes: [
      { fields: ["organization_id", "created_at"] },
      { fields: ["organization_id", "entity_type", "entity_id"] },
    ],
  },
);

export const Notification = sequelize.define(
  "Notification",
  {
    id: uuidPk(),
    organizationId: orgId(),
    recipientUserId: fk(true),
    recipientEmail: str(254),
    channel: { ...enumOf(E.NotificationChannel), type: DataTypes.STRING(16) },
    templateKey: str(100, false),
    subject: str(180),
    status: enumOf(E.NotificationStatus, "queued"),
    relatedEntityType: str(40),
    relatedEntityId: fk(true),
    scheduledAt: ts(),
    sentAt: ts(),
    providerMessageId: str(180),
    lastError: text(),
  },
  {
    tableName: "notifications",
    indexes: [{ fields: ["organization_id", "status"] }, { fields: ["recipient_user_id", "created_at"] }],
  },
);

export const CustomerPortalLink = sequelize.define(
  "CustomerPortalLink",
  {
    id: uuidPk(),
    organizationId: orgId(),
    projectId: fk(),
    customerId: fk(true),
    tokenHash: { ...str(255, false), unique: true },
    permissions: { type: DataTypes.JSONB, allowNull: false, defaultValue: { read_project: true } },
    expiresAt: ts(),
    lastAccessedAt: ts(),
    revokedAt: ts(),
    createdByUserId: fk(),
  },
  { tableName: "customer_portal_links", ...createdOnly, indexes: [{ fields: ["project_id"] }] },
);

export const CustomerPortalEvent = sequelize.define(
  "CustomerPortalEvent",
  {
    id: uuidPk(),
    organizationId: orgId(),
    portalLinkId: fk(),
    eventType: { ...enumOf(E.PortalEventType), type: DataTypes.STRING(40) },
    entityType: str(40),
    entityId: fk(true),
    occurredAt: ts(false),
    metadata: json(),
  },
  { tableName: "customer_portal_events", timestamps: false, indexes: [{ fields: ["portal_link_id"] }] },
);

// Unhandled server errors (5xx). Org/user nullable: errors can happen before auth resolves.
export const ErrorLog = sequelize.define(
  "ErrorLog",
  {
    id: uuidPk(),
    organizationId: fk(true),
    userId: fk(true),
    requestId: str(100),
    source: enumOf(E.ErrorLogSource),
    method: str(10),
    path: str(500),
    statusCode: int(undefined, true),
    errorName: str(120),
    message: text(false),
    stack: text(),
    ipAddress: inet(),
    userAgent: text(),
    metadata: json(true),
  },
  {
    tableName: "error_logs",
    ...createdOnly,
    indexes: [{ fields: ["created_at"] }, { fields: ["organization_id", "created_at"] }, { fields: ["request_id"] }],
  },
);

// Every sign-in attempt. userId is null when the email is unknown.
export const LoginLog = sequelize.define(
  "LoginLog",
  {
    id: uuidPk(),
    userId: fk(true),
    email: str(254, false),
    success: { type: DataTypes.BOOLEAN, allowNull: false },
    failureReason: str(60),
    method: enumOf(E.LoginMethod, "password"),
    ipAddress: inet(),
    userAgent: text(),
    requestId: str(100),
  },
  {
    tableName: "login_logs",
    ...createdOnly,
    indexes: [
      { fields: ["user_id", "created_at"] },
      { fields: ["email", "created_at"] },
      { fields: ["ip_address", "created_at"] },
    ],
  },
);
