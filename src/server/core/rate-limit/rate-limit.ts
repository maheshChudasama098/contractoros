import "server-only";
import { redis } from "@server/core/redis/client";
import { logger } from "@server/core/logger";

export type RateLimitRule = { name: string; limit: number; windowSec: number };

export type RateLimitResult = { allowed: boolean; limit: number; remaining: number; resetSec: number };

// Defaults per bucket. Tune via env if needed; keep auth strict to slow brute force.
export const RATE_LIMITS = {
  api: { name: "api", limit: 300, windowSec: 60 }, // per IP, all API routes
  apiUser: { name: "api-user", limit: 600, windowSec: 60 }, // per authenticated user
  auth: { name: "auth", limit: 10, windowSec: 15 * 60 }, // login / reset / verify per IP
  loginEmail: { name: "login-email", limit: 5, windowSec: 15 * 60 }, // failed logins per email
  otpEmail: { name: "otp-email", limit: 3, windowSec: 15 * 60 }, // reset-code emails per address
  portal: { name: "portal", limit: 60, windowSec: 60 }, // customer portal token routes
} satisfies Record<string, RateLimitRule>;

/**
 * Fixed-window counter in Redis. Fails open if Redis is unavailable:
 * an outage must not take the whole API down.
 */
export async function consumeRateLimit(rule: RateLimitRule, key: string): Promise<RateLimitResult> {
  const windowId = Math.floor(Date.now() / 1000 / rule.windowSec);
  const redisKey = `rl:${rule.name}:${key}:${windowId}`;
  const resetSec = rule.windowSec - (Math.floor(Date.now() / 1000) % rule.windowSec);
  try {
    if (redis.status === "wait") await redis.connect();
    const [[, count]] = (await redis.multi().incr(redisKey).expire(redisKey, rule.windowSec).exec()) as [
      [Error | null, number],
      unknown,
    ];
    return { allowed: count <= rule.limit, limit: rule.limit, remaining: Math.max(0, rule.limit - count), resetSec };
  } catch (err) {
    logger.warn({ err, rule: rule.name }, "rate limiter unavailable, allowing request");
    return { allowed: true, limit: rule.limit, remaining: rule.limit, resetSec };
  }
}

/** Clears a bucket, e.g. failed-login counter after a successful sign-in. */
export async function resetRateLimit(rule: RateLimitRule, key: string): Promise<void> {
  const windowId = Math.floor(Date.now() / 1000 / rule.windowSec);
  await redis.del(`rl:${rule.name}:${key}:${windowId}`).catch(() => undefined);
}

export function rateLimitHeaders(r: RateLimitResult): Record<string, string> {
  return {
    "RateLimit-Limit": String(r.limit),
    "RateLimit-Remaining": String(r.remaining),
    "RateLimit-Reset": String(r.resetSec),
  };
}
