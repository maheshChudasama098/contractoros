import "server-only";
import { Errors } from "@server/core/http/errors";
import type { TenantContext } from "@server/core/tenancy/context";
import type { PermissionKey } from "./permissions";

export function can(ctx: TenantContext, permission: PermissionKey): boolean {
  return ctx.permissions.has(permission);
}

export function authorize(ctx: TenantContext, permission: PermissionKey): void {
  if (!can(ctx, permission)) throw Errors.forbidden();
}
