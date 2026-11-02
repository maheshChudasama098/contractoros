import { DataTypes } from "sequelize";
import { sequelize } from "../sequelize";
import * as E from "../enums";
import { bool, createdOnly, currency, enumOf, fk, json, money, orgId, str, text, ts, uuidPk } from "./columns";

// M02–M04 leads, customers, properties, activities.

export const LeadSource = sequelize.define(
  "LeadSource",
  {
    id: uuidPk(),
    organizationId: orgId(),
    name: str(80, false),
    isActive: bool(true),
  },
  { tableName: "lead_sources", indexes: [{ fields: ["organization_id"] }] },
);

export const Lead = sequelize.define(
  "Lead",
  {
    id: uuidPk(),
    organizationId: orgId(),
    firstName: str(100),
    lastName: str(100),
    companyName: str(160),
    email: str(254),
    phone: str(32),
    sourceId: fk(true),
    stage: enumOf(E.LeadStage, "new"),
    ownerMembershipId: fk(true),
    estimatedValue: money(true),
    currency: currency(),
    nextFollowUpAt: ts(),
    lostReason: str(255),
    convertedCustomerId: fk(true),
    notes: text(),
    createdByUserId: fk(true),
  },
  {
    tableName: "leads",
    indexes: [
      { fields: ["organization_id", "stage"] },
      { fields: ["organization_id", "created_at"] },
      { fields: ["owner_membership_id"] },
    ],
  },
);

export const Customer = sequelize.define(
  "Customer",
  {
    id: uuidPk(),
    organizationId: orgId(),
    customerType: { ...enumOf(E.CustomerType, "individual"), type: DataTypes.STRING(20) },
    displayName: str(180, false),
    firstName: str(100),
    lastName: str(100),
    companyName: str(160),
    email: str(254),
    phone: str(32),
    billingAddressLine1: { ...str(180), field: "billing_address_line1" },
    billingAddressLine2: { ...str(180), field: "billing_address_line2" },
    billingCity: str(100),
    billingState: str(80),
    billingPostalCode: str(20),
    billingCountry: { type: DataTypes.CHAR(2), allowNull: true },
    sourceLeadId: fk(true),
    status: enumOf(E.CustomerStatus, "active"),
    notes: text(),
  },
  {
    tableName: "customers",
    indexes: [{ fields: ["organization_id", "status"] }, { fields: ["organization_id", "created_at"] }],
  },
);

export const Property = sequelize.define(
  "Property",
  {
    id: uuidPk(),
    organizationId: orgId(),
    customerId: fk(),
    name: str(120),
    addressLine1: { ...str(180, false), field: "address_line1" },
    addressLine2: { ...str(180), field: "address_line2" },
    city: str(100, false),
    state: str(80, false),
    postalCode: str(20, false),
    country: { type: DataTypes.CHAR(2), allowNull: false, defaultValue: "US" },
    accessInstructions: text(), // sensitive, never expose publicly by default
  },
  { tableName: "properties", indexes: [{ fields: ["organization_id"] }, { fields: ["customer_id"] }] },
);

export const PropertyContact = sequelize.define(
  "PropertyContact",
  {
    id: uuidPk(),
    organizationId: orgId(),
    propertyId: fk(),
    customerId: fk(),
    relationship: str(40),
    isPrimary: bool(false),
  },
  { tableName: "property_contacts", ...createdOnly, indexes: [{ fields: ["property_id"] }] },
);

// Polymorphic subject: tenant/ownership validated in the service layer.
export const Activity = sequelize.define(
  "Activity",
  {
    id: uuidPk(),
    organizationId: orgId(),
    subjectType: { ...enumOf(E.ActivitySubjectType), type: DataTypes.STRING(40) },
    subjectId: fk(),
    activityType: { ...enumOf(E.ActivityType), type: DataTypes.STRING(40) },
    title: str(180, false),
    body: text(),
    occurredAt: ts(false),
    createdByUserId: fk(true),
    metadata: json(),
  },
  {
    tableName: "activities",
    ...createdOnly,
    indexes: [{ fields: ["organization_id", "subject_type", "subject_id"] }],
  },
);
