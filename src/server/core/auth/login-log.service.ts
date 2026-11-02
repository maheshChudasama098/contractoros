import "server-only";
import { sequelize, LoginLog, User } from "@server/core/db/models";
import { getRequestContext } from "@server/core/context/request-context";
import { logger } from "@server/core/logger";
import { consumeRateLimit, resetRateLimit, RATE_LIMITS } from "@server/core/rate-limit/rate-limit";
import { Errors } from "@server/core/http/errors";

export type LoginFailureReason =
  | "invalid_credentials"
  | "unknown_email"
  | "email_not_verified"
  | "account_disabled"
  | "rate_limited"
  | "invalid_token";

type LoginAttempt = {
  email: string;
  userId?: string | null;
  success: boolean;
  failureReason?: LoginFailureReason;
  method?: "password" | "magic_link" | "oauth" | "invite";
};

/** COS-005: call on every sign-in attempt. Updates users.last_login_at on success. */
export async function recordLoginAttempt(a: LoginAttempt): Promise<void> {
  const rc = getRequestContext();
  const email = a.email.trim().toLowerCase();
  try {
    await sequelize.transaction(async (transaction) => {
      await LoginLog.create(
        {
          email,
          userId: a.userId ?? null,
          success: a.success,
          failureReason: a.success ? null : (a.failureReason ?? "invalid_credentials"),
          method: a.method ?? "password",
          ipAddress: rc?.ipAddress,
          userAgent: rc?.userAgent,
          requestId: rc?.requestId,
        },
        { transaction },
      );
      if (a.success && a.userId) {
        await User.update({ lastLoginAt: new Date() }, { where: { id: a.userId }, transaction });
      }
    });
  } catch (err) {
    logger.error({ err }, "failed to record login attempt");
  }

  if (a.success) await resetRateLimit(RATE_LIMITS.loginEmail, email);
  else logger.warn({ email, reason: a.failureReason, ip: rc?.ipAddress }, "login failed");
}

/**
 * Call BEFORE checking credentials. Throws 429 when an email has too many recent failures
 * (brute force across IPs) — the per-IP auth limit is applied by `authRoute`.
 */
export async function assertLoginAllowed(email: string): Promise<void> {
  const r = await consumeRateLimit(RATE_LIMITS.loginEmail, email.trim().toLowerCase());
  if (!r.allowed) {
    await recordLoginAttempt({ email, success: false, failureReason: "rate_limited" });
    throw Errors.rateLimited();
  }
}
