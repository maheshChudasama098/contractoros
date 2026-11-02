import "server-only";
import { PrismaClient } from "@prisma/client";
import { env } from "@server/core/config/env";
import { auditExtension } from "@server/core/audit/audit.extension";

function createClient() {
  const base = new PrismaClient({ log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"] });
  return base.$extends(auditExtension(base));
}

// Single PrismaClient across hot reloads in dev.
const globalForPrisma = globalThis as unknown as { prisma?: ReturnType<typeof createClient> };

export const prisma = globalForPrisma.prisma ?? createClient();

if (env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];
