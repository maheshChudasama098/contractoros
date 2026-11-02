import "server-only";
import { cookies } from "next/headers";
import { Op } from "sequelize";
import { UserSession } from "@server/core/db/models";
import { env } from "@server/core/config/env";
import { getRequestContext } from "@server/core/context/request-context";
import { randomToken, sha256 } from "./crypto";

export type Session = { id: string; userId: string; activeOrganizationId: string | null };

export const SESSION_COOKIE = "cos_session";
const SHORT_TTL_SEC = 12 * 60 * 60; // browser session, "keep me signed in" unchecked
const LONG_TTL_SEC = 30 * 24 * 60 * 60;

/** Reads the HTTP-only session cookie. Never trust headers/body for identity. */
export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const row = await UserSession.findOne({
    where: { tokenHash: sha256(token), revokedAt: null, expiresAt: { [Op.gt]: new Date() } },
  });
  if (!row) return null;
  return {
    id: row.get("id") as string,
    userId: row.get("userId") as string,
    activeOrganizationId: (row.get("activeOrganizationId") as string | null) ?? null,
  };
}

export async function createSession(userId: string, activeOrganizationId: string | null, remember: boolean) {
  const token = randomToken();
  const ttl = remember ? LONG_TTL_SEC : SHORT_TTL_SEC;
  const rc = getRequestContext();
  await UserSession.create({
    userId,
    activeOrganizationId,
    tokenHash: sha256(token),
    expiresAt: new Date(Date.now() + ttl * 1000),
    ipAddress: rc?.ipAddress,
    userAgent: rc?.userAgent,
  });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    ...(remember && { maxAge: ttl }),
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await UserSession.update({ revokedAt: new Date() }, { where: { tokenHash: sha256(token) } });
  jar.delete(SESSION_COOKIE);
}

/** Revoke every session of a user, optionally keeping the current one (after a password change). */
export async function revokeUserSessions(userId: string, exceptSessionId?: string) {
  await UserSession.update(
    { revokedAt: new Date() },
    { where: { userId, revokedAt: null, ...(exceptSessionId && { id: { [Op.ne]: exceptSessionId } }) } },
  );
}
