// Non-production seed only (COS-003): permission catalog + system roles.
import { PrismaClient } from "@prisma/client";
import { PERMISSIONS, SYSTEM_ROLES } from "../src/server/core/authorization/permissions";

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Refusing to seed production");

  for (const key of PERMISSIONS) {
    await prisma.permission.upsert({ where: { key }, update: {}, create: { key } });
  }
  for (const [key, perms] of Object.entries(SYSTEM_ROLES)) {
    const role =
      (await prisma.role.findFirst({ where: { organizationId: null, key } })) ??
      (await prisma.role.create({ data: { key, name: key.replace("_", " ") } }));
    const permissions = await prisma.permission.findMany({ where: { key: { in: [...perms] } } });
    await prisma.rolePermission.createMany({
      data: permissions.map((p) => ({ roleId: role.id, permissionId: p.id })),
      skipDuplicates: true,
    });
  }
}

main().finally(() => prisma.$disconnect());
