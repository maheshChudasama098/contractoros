import "server-only";
import { prisma } from "@server/core/db/prisma";
import { setRequestActor } from "@server/core/context/request-context";
import { getSession } from "@server/core/auth/session";
import { Errors } from "@server/core/http/errors";
import type { PermissionKey } from "@server/core/authorization/permissions";

export type TenantContext = {
  userId: string;
  organizationId: string;
  membershipId: string;
  permissions: ReadonlySet<PermissionKey>;
  requestId: string;
};

/**
 * COS-007: resolve the active organization from the authenticated membership.
 * The organization ID is NEVER taken from client input.
 */
export async function requireTenantContext(requestId: string): Promise<TenantContext> {
  const session = await getSession();
  if (!session) throw Errors.unauthenticated();
  if (!session.activeOrganizationId) throw Errors.forbidden();

  const membership = await prisma.organizationMembership.findFirst({
    where: { userId: session.userId, organizationId: session.activeOrganizationId, status: "active" },
    include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } },
  });
  if (!membership) throw Errors.forbidden();

  const permissions = new Set(
    membership.roles.flatMap((mr) => mr.role.permissions.map((rp) => rp.permission.key as PermissionKey)),
  );

  setRequestActor(session.userId, membership.organizationId);

  return {
    userId: session.userId,
    organizationId: membership.organizationId,
    membershipId: membership.id,
    permissions,
    requestId,
  };
}
