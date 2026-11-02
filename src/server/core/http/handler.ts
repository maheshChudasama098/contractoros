import "server-only";
import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { ZodError, type ZodTypeAny, type output } from "zod";
import { AppError, Errors } from "./errors";
import { logger } from "@server/core/logger";
import { recordError } from "@server/core/logger/error-log.service";
import { buildRequestContext, getRequestContext, runWithRequestContext, setRequestActor } from "@server/core/context/request-context";
import {
  consumeRateLimit,
  rateLimitHeaders,
  RATE_LIMITS,
  type RateLimitResult,
  type RateLimitRule,
} from "@server/core/rate-limit/rate-limit";
import { getSession, type Session } from "@server/core/auth/session";
import { requireTenantContext, type TenantContext } from "@server/core/tenancy/context";
import type { ApiError } from "@shared/contracts/api";

type HandlerArgs<P> = { req: NextRequest; params: P; requestId: string };
type RouteCtx<P> = { params: Promise<P> };
type RouteOptions = { rateLimit?: RateLimitRule | false };

/**
 * Wraps a public (no session) route handler: request ID, request context,
 * per-IP rate limit, access log and error envelope (5xx persisted to error_logs).
 */
export function publicRoute<P = Record<string, string>>(
  fn: (args: HandlerArgs<P>) => Promise<Response | unknown>,
  opts: RouteOptions = {},
) {
  return async (req: NextRequest, ctx: RouteCtx<P>) => {
    const requestId = req.headers.get("x-request-id") ?? randomUUID();
    const rc = buildRequestContext(req, requestId);
    const started = performance.now();

    return runWithRequestContext(rc, async () => {
      let res: Response;
      let rl: RateLimitResult | undefined;
      try {
        const rule = opts.rateLimit === undefined ? RATE_LIMITS.api : opts.rateLimit;
        if (rule) {
          rl = await consumeRateLimit(rule, rc.ipAddress ?? "unknown");
          if (!rl.allowed) throw Errors.rateLimited();
        }
        const result = await fn({ req, params: await ctx.params, requestId });
        res = result instanceof Response ? result : NextResponse.json({ data: result });
      } catch (err) {
        res = await toErrorResponse(err, requestId);
      }

      res.headers.set("x-request-id", requestId);
      if (rl) for (const [k, v] of Object.entries(rateLimitHeaders(rl))) res.headers.set(k, v);
      if (res.status === 429 && rl) res.headers.set("Retry-After", String(rl.resetSec));

      const ms = Math.round(performance.now() - started);
      const level = res.status >= 500 ? "error" : res.status >= 400 ? "warn" : "info";
      logger[level](
        { requestId, method: rc.method, path: rc.path, status: res.status, ms, ip: rc.ipAddress, userId: rc.userId },
        "request",
      );
      return res;
    });
  };
}

/** Wraps an authenticated contractor route: resolves tenant context, then applies a per-user limit. */
export function tenantRoute<P = Record<string, string>>(
  fn: (args: HandlerArgs<P> & { ctx: TenantContext }) => Promise<Response | unknown>,
  opts: RouteOptions = {},
) {
  return publicRoute<P>(async (args) => {
    const ctx = await requireTenantContext(args.requestId);
    const rl = await consumeRateLimit(RATE_LIMITS.apiUser, ctx.userId);
    if (!rl.allowed) throw Errors.rateLimited();
    return fn({ ...args, ctx });
  }, opts);
}

/** Signed-in user without requiring an active organization (profile, password change). */
export function sessionRoute<P = Record<string, string>>(
  fn: (args: HandlerArgs<P> & { session: Session }) => Promise<Response | unknown>,
  opts: RouteOptions = {},
) {
  return publicRoute<P>(async (args) => {
    const session = await getSession();
    if (!session) throw Errors.unauthenticated();
    setRequestActor(session.userId, session.activeOrganizationId ?? undefined);
    return fn({ ...args, session });
  }, opts);
}

/** Login / password reset / verify routes: strict per-IP limit (brute force protection). */
export function authRoute<P = Record<string, string>>(fn: (args: HandlerArgs<P>) => Promise<Response | unknown>) {
  return publicRoute<P>(fn, { rateLimit: RATE_LIMITS.auth });
}

export async function parseBody<S extends ZodTypeAny>(req: NextRequest, schema: S): Promise<output<S>> {
  const json = await req.json().catch(() => {
    throw Errors.validation({ _body: ["Invalid JSON"] });
  });
  return schema.parse(json);
}

export function parseQuery<S extends ZodTypeAny>(req: NextRequest, schema: S): output<S> {
  return schema.parse(Object.fromEntries(req.nextUrl.searchParams));
}

async function toErrorResponse(err: unknown, requestId: string) {
  let appErr: AppError;
  if (err instanceof AppError) appErr = err;
  else if (err instanceof ZodError) appErr = Errors.validation(err.flatten().fieldErrors as Record<string, string[]>);
  else {
    await recordError(err, { source: "api", statusCode: 500 });
    appErr = new AppError("internal_error", "Something went wrong", 500);
  }
  if (appErr.status === 429) {
    const rc = getRequestContext();
    logger.warn({ requestId, ip: rc?.ipAddress, path: rc?.path }, "rate limited");
  }
  const body: ApiError = {
    error: {
      code: appErr.code,
      message: appErr.message,
      field_errors: appErr.fieldErrors,
      request_id: requestId,
    },
  };
  return NextResponse.json(body, { status: appErr.status, headers: { "x-request-id": requestId } });
}
