import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma, type Tx } from "@server/core/db/prisma";

// Every query takes organizationId explicitly: tenant scoping lives here, not in callers.
export const leadRepository = {
  list(organizationId: string, opts: { stage?: string; skip: number; take: number }) {
    const where: Prisma.LeadWhereInput = { organizationId, ...(opts.stage && { stage: opts.stage }) };
    return prisma.$transaction([
      prisma.lead.findMany({ where, orderBy: { createdAt: "desc" }, skip: opts.skip, take: opts.take }),
      prisma.lead.count({ where }),
    ]);
  },

  findById(organizationId: string, id: string) {
    return prisma.lead.findFirst({ where: { id, organizationId } });
  },

  create(data: Prisma.LeadUncheckedCreateInput, tx: Tx = prisma) {
    return tx.lead.create({ data });
  },
};
