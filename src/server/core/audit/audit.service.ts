import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma, type Tx } from "@server/core/db/prisma";
import type { TenantContext } from "@server/core/tenancy/context";
import { getRequestContext } from "@server/core/context/request-context";

type AuditInput = {
  action: string; // e.g. "estimate.issued"
  entityType: string;
  entityId: string;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
};

/**
 * COS-009: append-only business event. Pass `tx` to record inside the business transaction.
 * Raw row changes are captured automatically by `auditExtension`; use this for domain events.
 */
export async function recordAudit(ctx: TenantContext, input: AuditInput, tx: Tx = prisma) {
  const rc = getRequestContext();
  await tx.auditLog.create({
    data: {
      organizationId: ctx.organizationId,
      actorUserId: ctx.userId,
      actorType: "user",
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      requestId: ctx.requestId,
      ipAddress: rc?.ipAddress,
      userAgent: rc?.userAgent,
      beforeSnapshot: input.before,
      afterSnapshot: input.after,
    },
  });
}
