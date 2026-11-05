import { DataTypes } from "sequelize";
import { sequelize } from "../sequelize";
import * as E from "../enums";
import {
  bool,
  createdOnly,
  currency,
  dateOnly,
  enumOf,
  fk,
  inet,
  int,
  json,
  money,
  orgId,
  qty,
  str,
  text,
  ts,
  uuidPk,
} from "./columns";

// M05–M07 estimates, proposals, contracts, e-signature.

export const Estimate = sequelize.define(
  "Estimate",
  {
    id: uuidPk(),
    organizationId: orgId(),
    estimateNumber: str(40, false),
    customerId: fk(),
    propertyId: fk(true),
    projectId: fk(true),
    status: enumOf(E.EstimateStatus, "draft"),
    currentVersionId: fk(true),
    currency: currency(),
    createdByUserId: fk(),
    issuedAt: ts(),
    acceptedAt: ts(),
    expiredAt: ts(),
  },
  {
    tableName: "estimates",
    indexes: [
      { unique: true, fields: ["organization_id", "estimate_number"] },
      { fields: ["organization_id", "status"] },
      { fields: ["customer_id"] },
    ],
  },
);

// Immutable once issued_at is set; changes create a new version.
export const EstimateVersion = sequelize.define(
  "EstimateVersion",
  {
    id: uuidPk(),
    organizationId: orgId(),
    estimateId: fk(),
    versionNumber: int(),
    title: str(180, false),
    scopeDescription: text(),
    subtotal: money(),
    discountTotal: money(false, 0),
    taxTotal: money(false, 0),
    total: money(),
    internalCostTotal: money(true),
    marginAmount: money(true),
    taxSnapshot: json(),
    taxRate: { type: DataTypes.DECIMAL(6, 3), allowNull: false, defaultValue: 0 }, // percent
    termsSnapshot: text(),
    customerNotes: text(),
    validUntil: dateOnly(),
    issuedAt: ts(),
    createdByUserId: fk(),
  },
  {
    tableName: "estimate_versions",
    ...createdOnly,
    indexes: [{ unique: true, fields: ["estimate_id", "version_number"] }],
  },
);

export const EstimateItem = sequelize.define(
  "EstimateItem",
  {
    id: uuidPk(),
    organizationId: orgId(),
    estimateVersionId: fk(),
    sortOrder: int(0),
    itemType: enumOf(E.EstimateItemType),
    name: str(180, false),
    description: text(),
    quantity: qty(),
    unit: str(30, false),
    unitPrice: money(),
    lineSubtotal: money(),
    taxable: bool(true),
    taxAmount: money(false, 0),
    internalUnitCost: money(true),
    internalLineCost: money(true),
  },
  { tableName: "estimate_items", ...createdOnly, indexes: [{ fields: ["estimate_version_id"] }] },
);

export const Proposal = sequelize.define(
  "Proposal",
  {
    id: uuidPk(),
    organizationId: orgId(),
    proposalNumber: str(40, false),
    estimateId: fk(),
    estimateVersionId: fk(),
    customerId: fk(),
    status: enumOf(E.ProposalStatus, "draft"),
    publicTokenHash: { ...str(255), unique: true },
    expiresAt: ts(),
    sentAt: ts(),
    viewedAt: ts(),
    acceptedAt: ts(),
    declinedAt: ts(),
    withdrawnAt: ts(),
    message: text(), // cover note shown to the customer
    declineReason: str(500),
    acceptedByName: str(160),
    acceptedByEmail: str(254),
    acceptedIp: inet(),
    createdByUserId: fk(),
  },
  {
    tableName: "proposals",
    indexes: [
      { unique: true, fields: ["organization_id", "proposal_number"] },
      { fields: ["organization_id", "status"] },
      { fields: ["customer_id"] },
    ],
  },
);

export const Contract = sequelize.define(
  "Contract",
  {
    id: uuidPk(),
    organizationId: orgId(),
    contractNumber: str(40, false),
    proposalId: fk(true),
    estimateVersionId: fk(true),
    customerId: fk(),
    projectId: fk(true),
    status: enumOf(E.ContractStatus, "draft"),
    documentFileId: fk(true),
    signedDocumentFileId: fk(true),
    signatureProvider: str(40),
    providerEnvelopeId: str(160),
    signedAt: ts(),
    title: str(180),
    contractValue: money(false, 0),
    body: text(), // agreement text (editable while draft)
    signerName: str(160),
    signerEmail: str(254),
    snapshot: json(), // frozen document sent for signature
    documentHash: str(64), // sha256 of the frozen snapshot
    sentAt: ts(),
    voidedAt: ts(),
    voidReason: str(255),
    createdByUserId: fk(),
  },
  {
    tableName: "contracts",
    indexes: [
      { unique: true, fields: ["organization_id", "contract_number"] },
      { fields: ["organization_id", "status"] },
      { fields: ["customer_id"] },
      { fields: ["project_id"] },
    ],
  },
);

export const SignatureRequest = sequelize.define(
  "SignatureRequest",
  {
    id: uuidPk(),
    organizationId: orgId(),
    contractId: fk(),
    providerRequestId: str(160),
    signerName: str(160, false),
    signerEmail: str(254, false),
    status: enumOf(E.SignatureRequestStatus, "created"),
    tokenHash: { ...str(64), unique: true },
    expiresAt: ts(),
    documentHash: str(64), // document the signer was shown
    signedName: str(160),
    signatureType: str(16), // typed | drawn
    signatureImage: text(), // PNG data URL when drawn
    signerIp: inet(),
    signerUserAgent: text(),
    declineReason: str(500),
    sentAt: ts(),
    completedAt: ts(),
  },
  { tableName: "signature_requests", indexes: [{ fields: ["contract_id"] }] },
);

// Append-only provider event log.
export const SignatureEvent = sequelize.define(
  "SignatureEvent",
  {
    id: uuidPk(),
    organizationId: orgId(),
    requestId: fk(),
    eventType: { ...enumOf(E.SignatureEventType), type: DataTypes.STRING(40) },
    occurredAt: ts(false),
    providerEventId: { ...str(160), unique: true },
    payloadSummary: json(),
  },
  { tableName: "signature_events", ...createdOnly, indexes: [{ fields: ["request_id"] }] },
);
