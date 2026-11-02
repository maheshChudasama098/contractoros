import "server-only";
import { Prisma, type PrismaClient } from "@prisma/client";
import { getRequestContext } from "@server/core/context/request-context";
import { logger } from "@server/core/logger";

// Log tables themselves are never audited (would recurse / add noise).
const SKIP_MODELS = new Set(["AuditLog", "ErrorLog", "LoginLog"]);
// Never copy secrets into snapshots.
const REDACT_KEYS = /password|secret|token|hash|otp/i;
const MANY_LIMIT = 200;

type Row = Record<string, unknown> & { id?: unknown; organizationId?: unknown };

function sanitize(row: unknown): Prisma.InputJsonValue | undefined {
  if (!row || typeof row !== "object") return undefined;
  return JSON.parse(
    JSON.stringify(row, (k, v) => (k && REDACT_KEYS.test(k) ? "[redacted]" : typeof v === "bigint" ? v.toString() : v)),
  );
}

function delegate(base: PrismaClient, model: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (base as any)[model.charAt(0).toLowerCase() + model.slice(1)];
}

/**
 * COS-009: automatic change history. Every create/update/upsert/delete (and *Many) on a
 * model with a single `id` column writes an audit_logs row with before/after snapshots.
 * Business-level events ("estimate.issued") should still use `recordAudit` explicitly.
 *
 * Audit rows are written on the base client after the write succeeds, so a write inside a
 * transaction that later rolls back can leave an orphan audit row; that's preferred over losing history.
 */
export function auditExtension(base: PrismaClient) {
  async function write(model: string, op: string, before: Row | null, after: Row | null) {
    const rc = getRequestContext();
    const row = after ?? before;
    const entityId = row?.id;
    const organizationId = (row?.organizationId as string | undefined) ?? rc?.organizationId;
    if (typeof entityId !== "string" || !organizationId) return; // no tenant to attach it to
    try {
      await base.auditLog.create({
        data: {
          organizationId,
          actorUserId: rc?.userId ?? null,
          actorType: rc?.userId ? "user" : "system",
          action: `${model.toLowerCase()}.${op}`,
          entityType: model.toLowerCase().slice(0, 40),
          entityId,
          requestId: rc?.requestId,
          ipAddress: rc?.ipAddress,
          userAgent: rc?.userAgent,
          beforeSnapshot: sanitize(before),
          afterSnapshot: sanitize(after),
        },
      });
    } catch (err) {
      logger.error({ err, model, op, entityId }, "failed to write audit log");
    }
  }

  return Prisma.defineExtension({
    name: "audit",
    query: {
      $allModels: {
        async create({ model, args, query }) {
          const result = await query(args);
          if (!SKIP_MODELS.has(model)) await write(model, "created", null, result as Row);
          return result;
        },
        async update({ model, args, query }) {
          if (SKIP_MODELS.has(model)) return query(args);
          const before = await delegate(base, model).findUnique({ where: args.where });
          const result = await query(args);
          await write(model, "updated", before, result as Row);
          return result;
        },
        async upsert({ model, args, query }) {
          if (SKIP_MODELS.has(model)) return query(args);
          const before = await delegate(base, model).findUnique({ where: args.where });
          const result = await query(args);
          await write(model, before ? "updated" : "created", before, result as Row);
          return result;
        },
        async delete({ model, args, query }) {
          if (SKIP_MODELS.has(model)) return query(args);
          const before = await delegate(base, model).findUnique({ where: args.where });
          const result = await query(args);
          await write(model, "deleted", before ?? (result as Row), null);
          return result;
        },
        async updateMany({ model, args, query }) {
          if (SKIP_MODELS.has(model)) return query(args);
          const d = delegate(base, model);
          const befores: Row[] = await d.findMany({ where: args.where, take: MANY_LIMIT });
          const result = await query(args);
          const ids = befores.map((b) => b.id).filter((id) => typeof id === "string");
          if (ids.length) {
            const afters: Row[] = await d.findMany({ where: { id: { in: ids } } });
            const byId = new Map(afters.map((a) => [a.id, a]));
            await Promise.all(befores.map((b) => write(model, "updated", b, byId.get(b.id) ?? null)));
          }
          return result;
        },
        async deleteMany({ model, args, query }) {
          if (SKIP_MODELS.has(model)) return query(args);
          const befores: Row[] = await delegate(base, model).findMany({ where: args.where, take: MANY_LIMIT });
          const result = await query(args);
          await Promise.all(befores.map((b) => write(model, "deleted", b, null)));
          return result;
        },
      },
    },
  });
}
