import "server-only";
import { prisma } from "@server/core/db/prisma";
import { getRequestContext } from "@server/core/context/request-context";
import { logger } from "./index";

type ErrorLogInput = {
  source?: "api" | "server" | "worker";
  statusCode?: number;
  metadata?: Record<string, unknown>;
};

/**
 * Persists an unexpected error to `error_logs` (plus pino). Never throws:
 * a failing error logger must not mask the original error.
 */
export async function recordError(err: unknown, input: ErrorLogInput = {}): Promise<void> {
  const rc = getRequestContext();
  const e = err instanceof Error ? err : new Error(String(err));
  logger.error({ err: e, requestId: rc?.requestId, path: rc?.path }, "unhandled error");
  try {
    await prisma.errorLog.create({
      data: {
        source: input.source ?? "api",
        statusCode: input.statusCode ?? 500,
        errorName: e.name.slice(0, 120),
        message: e.message.slice(0, 5000) || "(no message)",
        stack: e.stack?.slice(0, 20000),
        requestId: rc?.requestId,
        method: rc?.method,
        path: rc?.path?.slice(0, 500),
        ipAddress: rc?.ipAddress,
        userAgent: rc?.userAgent,
        userId: rc?.userId,
        organizationId: rc?.organizationId,
        metadata: input.metadata as object | undefined,
      },
    });
  } catch (dbErr) {
    logger.error({ err: dbErr }, "failed to persist error log");
  }
}
