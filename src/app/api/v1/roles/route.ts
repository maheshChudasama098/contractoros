import { NextResponse } from "next/server";
import { parseBody, tenantRoute } from "@server/core/http/handler";
import { roleService } from "@server/modules/access";
import { CreateRoleInput } from "@shared/contracts/access";

export const GET = tenantRoute(async ({ ctx }) => roleService.list(ctx));

export const POST = tenantRoute(async ({ req, ctx }) => {
  const role = await roleService.create(ctx, await parseBody(req, CreateRoleInput));
  return NextResponse.json({ data: role }, { status: 201 });
});
