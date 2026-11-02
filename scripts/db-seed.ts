// Non-production seed only (COS-003): permission catalog + system roles, via Sequelize.
import { sequelize, Permission, Role, RolePermission } from "../src/server/core/db/models";
import { PERMISSIONS, SYSTEM_ROLES } from "../src/server/core/authorization/permissions";

// "project_manager" -> "Project Manager"
const roleLabel = (key: string) => key.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Refusing to seed production");

  await sequelize.transaction(async (transaction) => {
    for (const key of PERMISSIONS) {
      await Permission.findOrCreate({ where: { key }, transaction });
    }
    for (const [key, perms] of Object.entries(SYSTEM_ROLES)) {
      const [role] = await Role.findOrCreate({
        where: { organizationId: null, key },
        defaults: { name: roleLabel(key) },
        transaction,
      });
      await role.update({ name: roleLabel(key) }, { transaction });
      const permissions = await Permission.findAll({ where: { key: [...perms] }, transaction });
      await RolePermission.bulkCreate(
        permissions.map((p) => ({ roleId: role.get("id"), permissionId: p.get("id") })),
        { ignoreDuplicates: true, transaction },
      );
    }
  });
  console.log(`Seeded ${PERMISSIONS.length} permissions and ${Object.keys(SYSTEM_ROLES).length} system roles`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
