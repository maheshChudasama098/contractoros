import { DataTypes } from "sequelize";
import { sequelize } from "../sequelize";
import * as E from "../enums";
import {
  bool,
  createdOnly,
  currency,
  enumOf,
  fk,
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
    termsSnapshot: text(),
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
    acceptedAt: ts(),
    declinedAt: ts(),
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
