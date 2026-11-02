import "server-only";
import { redirect } from "next/navigation";
import { User } from "@server/core/db/models";
import { onboardingService } from "@server/modules/onboarding";
import { getSession } from "./session";

/** Server-component guard for the app: signed in AND onboarding finished. */
export async function requireAppAccess() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (await onboardingService.isPending(session)) redirect("/onboarding");
  return session;
}

/** Server-component guard for /onboarding: signed in AND setup still pending. */
export async function requirePendingOnboarding() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!(await onboardingService.isPending(session))) redirect("/dashboard");
  return session;
}

/** Server-component guard for platform admin pages (master data). */
export async function requireSuperAdmin() {
  const session = await requireAppAccess();
  const user = await User.findByPk(session.userId, { attributes: ["isSuperAdmin"] });
  if (!user?.get("isSuperAdmin")) redirect("/dashboard");
  return session;
}
