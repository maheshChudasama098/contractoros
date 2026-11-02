import { NextResponse } from "next/server";
import { parseBody, parseQuery, tenantRoute } from "@server/core/http/handler";
import { customerService } from "@server/modules/customers";
import { CustomerInput, CustomerListQuery } from "@shared/contracts/customers";

export const GET = tenantRoute(async ({ req, ctx }) => customerService.list(ctx, parseQuery(req, CustomerListQuery)));

export const POST = tenantRoute(async ({ req, ctx }) => {
  const customer = await customerService.create(ctx, await parseBody(req, CustomerInput));
  return NextResponse.json({ data: customer }, { status: 201 });
});
