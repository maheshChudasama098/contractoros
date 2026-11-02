import { NextResponse } from "next/server";
import { parseBody, tenantRoute } from "@server/core/http/handler";
import { roleService } from "@server/modules/access";
import { UpdateRoleInput } from "@shared/contracts/access";

type P = { roleId: string };

export const GET = tenantRoute<P>(async ({ ctx, params }) => roleService.get(ctx, params.roleId));

export const PATCH = tenantRoute<P>(async ({ req, ctx, params }) =>
  roleService.update(ctx, params.roleId, await parseBody(req, UpdateRoleInput)),
);

export const DELETE = tenantRoute<P>(async ({ ctx, params }) => {
  await roleService.remove(ctx, params.roleId);
  return new NextResponse(null, { status: 204 });
});
