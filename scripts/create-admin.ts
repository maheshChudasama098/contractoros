// Non-production: create (or reset) a login-ready owner user with its own organization.
// Usage: tsx --env-file=.env scripts/create-admin.ts <email> <password> [name]
import { randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";
import { sequelize, Organization, User, OrganizationMembership, Role, MembershipRole } from "../src/server/core/db/models";

const scryptAsync = promisify(scrypt) as (pw: string, salt: Buffer, keylen: number) => Promise<Buffer>;

// Same format as src/server/core/auth/crypto.ts (that module is server-only, so it can't be imported here).
async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, 64);
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
}

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Refusing to run in production");
  const [email, password, name = "Admin"] = process.argv.slice(2);
  if (!email || !password) throw new Error("Usage: create-admin.ts <email> <password> [name]");

  const passwordHash = await hashPassword(password);
  await sequelize.transaction(async (transaction) => {
    const ownerRole = await Role.findOne({ where: { organizationId: null, key: "owner" }, transaction });
    if (!ownerRole) throw new Error("System roles missing — run `npm run db:seed` first");

    const [user] = await User.findOrCreate({ where: { email: email.toLowerCase() }, defaults: { name }, transaction });
    await user.update(
      { name, passwordHash, passwordChangedAt: new Date(), status: "active", emailVerifiedAt: new Date() },
      { transaction },
    );

    const [org] = await Organization.findOrCreate({
      where: { slug: "admin-org" },
      defaults: { name: "Admin Organization", status: "active", timezone: "UTC" },
      transaction,
    });
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
  });
  console.log(`User ${email} ready (owner of "Admin Organization")`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
