import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import type { NextRequest } from "next/server";

/**
 * Per-request metadata, available anywhere below the route handler without prop drilling.
 * Used by audit/error/login logging. userId/organizationId are filled in once auth resolves.
 */
export type RequestContext = {
  requestId: string;
  method: string;
  path: string;
  ipAddress: string | null;
  userAgent: string | null;
  userId?: string;
  organizationId?: string;
};

const storage = new AsyncLocalStorage<RequestContext>();

export function runWithRequestContext<T>(ctx: RequestContext, fn: () => T): T {
  return storage.run(ctx, fn);
}

export function getRequestContext(): RequestContext | undefined {
  return storage.getStore();
}

export function setRequestActor(userId: string, organizationId?: string) {
  const ctx = storage.getStore();
  if (!ctx) return;
  ctx.userId = userId;
  ctx.organizationId = organizationId;
}

/** First hop of x-forwarded-for (set by the load balancer), else x-real-ip. */
export function clientIp(req: NextRequest): string | null {
  const fwd = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = fwd || req.headers.get("x-real-ip") || null;
  // Only keep values Postgres `inet` will accept.
  return ip && /^[0-9a-fA-F:.]+$/.test(ip) ? ip : null;
}

export function buildRequestContext(req: NextRequest, requestId: string): RequestContext {
  return {
    requestId,
    method: req.method,
    path: req.nextUrl.pathname,
    ipAddress: clientIp(req),
    userAgent: req.headers.get("user-agent"),
  };
}
