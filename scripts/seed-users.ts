// Non-production: login-ready demo accounts (idempotent; resets their password every run).
//   superadmin@gmail.com  super admin (platform master data), owner of "Admin Organization"
//   admin@gmail.com       owner of "Demo Company" (a normal contractor account)
// Usage: npm run db:seed:users
import { randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";
import type { Transaction } from "sequelize";
import {
  sequelize,
  Industry,
  MasterItem,
  MembershipRole,
  Organization,
  OrganizationMembership,
  Role,
  User,
} from "../src/server/core/db/models";

const PASSWORD = "Admin@123";

const USERS = [
  { email: "superadmin@gmail.com", name: "Super Admin", superAdmin: true, org: { slug: "admin-org", name: "Admin Organization" } },
  { email: "admin@gmail.com", name: "Admin", superAdmin: false, org: { slug: "demo-company", name: "Demo Company" } },
];

const scryptAsync = promisify(scrypt) as (pw: string, salt: Buffer, keylen: number) => Promise<Buffer>;

// Same format as src/server/core/auth/crypto.ts (that module is server-only, so it can't be imported here).
async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, 64);
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
}

/** Fills the onboarding fields so the account lands on the dashboard, not the setup wizard. */
async function onboardedDefaults(transaction: Transaction) {
  const industry = await Industry.findOne({ where: { isActive: true }, order: [["sortOrder", "ASC"]], transaction });
  const size = await MasterItem.findOne({ where: { type: "company_size", code: "2_5" }, transaction });
  const tz = await MasterItem.findOne({ where: { type: "time_zone", code: "America/Chicago" }, transaction });
  return {
    industryId: industry?.get("id") ?? null,
    companySize: (size?.get("code") as string | undefined) ?? null,
    timezone: (tz?.get("code") as string | undefined) ?? "America/Chicago",
    onboardingCompletedAt: new Date(),
  };
}

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Refusing to run in production");
  const passwordHash = await hashPassword(PASSWORD);

  await sequelize.transaction(async (transaction) => {
    const ownerRole = await Role.findOne({ where: { organizationId: null, key: "owner" }, transaction });
    if (!ownerRole) throw new Error("System roles missing — run `npm run db:seed` first");
    const defaults = await onboardedDefaults(transaction);

    for (const u of USERS) {
      const [user] = await User.findOrCreate({ where: { email: u.email }, defaults: { name: u.name }, transaction });
      await user.update(
        {
          name: u.name,
          passwordHash,
          passwordChangedAt: new Date(),
          status: "active",
          emailVerifiedAt: new Date(),
          isSuperAdmin: u.superAdmin,
        },
        { transaction },
      );

      const [org] = await Organization.findOrCreate({
        where: { slug: u.org.slug },
        defaults: { name: u.org.name, status: "active", ...defaults },
        transaction,
      });
      if (!org.get("onboardingCompletedAt")) await org.update(defaults, { transaction });

      const [membership] = await OrganizationMembership.findOrCreate({
        where: { organizationId: org.get("id"), userId: user.get("id") },
        defaults: { status: "active", joinedAt: new Date() },
        transaction,
      });
      await membership.update({ status: "active" }, { transaction });
      await MembershipRole.findOrCreate({
        where: { membershipId: membership.get("id"), roleId: ownerRole.get("id") },
        transaction,
      });
      console.log(`${u.email} ready${u.superAdmin ? " (super admin)" : ""}, owner of "${org.get("name")}"`);
    }
  });
  console.log(`Password for all: ${PASSWORD}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
