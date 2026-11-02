import { sequelize } from "../sequelize";
import * as E from "../enums";
import { bool, createdOnly, enumOf, fk, json, orgId, str, ts, uuidPk } from "./columns";
import { DataTypes } from "sequelize";

// M01 organizations, users, memberships, RBAC, invitations, subscriptions.

export const Organization = sequelize.define(
  "Organization",
  {
    id: uuidPk(),
    name: str(160, false),
    slug: { ...str(100, false), unique: true },
    status: enumOf(E.OrganizationStatus, "trial"),
    timezone: str(64, false),
    defaultCurrency: { type: DataTypes.CHAR(3), allowNull: false, defaultValue: "USD" },
    phone: str(32),
    email: str(254),
    website: str(255),
    addressLine1: { ...str(180), field: "address_line1" },
    addressLine2: { ...str(180), field: "address_line2" },
    city: str(100),
    state: str(80),
    postalCode: str(20),
    country: { type: DataTypes.CHAR(2), allowNull: true },
    settings: json(),
  },
  { tableName: "organizations" },
);

export const User = sequelize.define(
  "User",
  {
    id: uuidPk(),
    email: { ...str(254, false), unique: true },
    emailVerifiedAt: ts(),
    name: str(160, false),
    phone: str(32),
    avatarFileId: fk(true),
    status: enumOf(E.UserStatus, "pending"),
    passwordHash: str(255),
    passwordChangedAt: ts(),
    lastLoginAt: ts(),
  },
  { tableName: "users" },
);

// Server-side sessions. Cookie holds the raw token; only its SHA-256 hash is stored.
export const UserSession = sequelize.define(
  "UserSession",
  {
    id: uuidPk(),
    userId: fk(),
    tokenHash: { ...str(64, false), unique: true },
    activeOrganizationId: fk(true),
    ipAddress: { type: DataTypes.INET, allowNull: true },
    userAgent: { type: DataTypes.TEXT, allowNull: true },
    expiresAt: ts(false),
    revokedAt: ts(),
  },
  { tableName: "user_sessions", indexes: [{ fields: ["user_id"] }] },
);

// One-time codes (password reset, email verification). Code and reset token are stored hashed.
export const AuthOtp = sequelize.define(
  "AuthOtp",
  {
    id: uuidPk(),
    userId: fk(),
    purpose: enumOf(E.OtpPurpose),
    codeHash: str(64, false),
    attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    expiresAt: ts(false),
    verifiedAt: ts(),
    resetTokenHash: { ...str(64), unique: true },
    consumedAt: ts(),
  },
  { tableName: "auth_otps", ...createdOnly, indexes: [{ fields: ["user_id", "purpose", "created_at"] }] },
);

export const OrganizationMembership = sequelize.define(
  "OrganizationMembership",
  {
    id: uuidPk(),
    organizationId: orgId(),
    userId: fk(),
    status: enumOf(E.MembershipStatus, "invited"),
    jobTitle: str(100),
    joinedAt: ts(),
  },
  {
    tableName: "organization_memberships",
    indexes: [{ unique: true, fields: ["organization_id", "user_id"] }, { fields: ["user_id"] }],
  },
);

export const Role = sequelize.define(
  "Role",
  {
    id: uuidPk(),
    organizationId: fk(true), // null = system role
    key: str(60, false),
    name: str(100, false),
  },
  { tableName: "roles", timestamps: false, indexes: [{ unique: true, fields: ["organization_id", "key"] }] },
);

export const Permission = sequelize.define(
  "Permission",
  {
    id: uuidPk(),
    key: { ...str(80, false), unique: true },
  },
  { tableName: "permissions", timestamps: false },
);

export const RolePermission = sequelize.define(
  "RolePermission",
  {
    roleId: { ...fk(), primaryKey: true },
    permissionId: { ...fk(), primaryKey: true },
  },
  { tableName: "role_permissions", timestamps: false },
);

export const MembershipRole = sequelize.define(
  "MembershipRole",
  {
    membershipId: { ...fk(), primaryKey: true },
    roleId: { ...fk(), primaryKey: true },
  },
  { tableName: "membership_roles", timestamps: false },
);

export const Invitation = sequelize.define(
  "Invitation",
  {
    id: uuidPk(),
    organizationId: orgId(),
    email: str(254, false),
    tokenHash: { ...str(255, false), unique: true },
    invitedByUserId: fk(),
    expiresAt: ts(false),
    acceptedAt: ts(),
    revokedAt: ts(),
  },
  { tableName: "invitations", ...createdOnly, indexes: [{ fields: ["organization_id", "email"] }] },
);

// Normalized role grants for an invitation (spec prefers join table over JSONB).
export const InvitationRole = sequelize.define(
  "InvitationRole",
  {
    invitationId: { ...fk(), primaryKey: true },
    roleId: { ...fk(), primaryKey: true },
  },
  { tableName: "invitation_roles", timestamps: false },
);

export const Subscription = sequelize.define(
  "Subscription",
  {
    id: uuidPk(),
    organizationId: orgId(),
    provider: enumOf(E.PaymentProvider, "stripe"),
    providerCustomerId: str(128),
    providerSubscriptionId: { ...str(128), unique: true },
    planKey: str(60, false),
    status: enumOf(E.SubscriptionStatus),
    currentPeriodStart: ts(),
    currentPeriodEnd: ts(),
    cancelAtPeriodEnd: bool(false),
  },
  { tableName: "subscriptions", indexes: [{ fields: ["organization_id", "status"] }] },
);
