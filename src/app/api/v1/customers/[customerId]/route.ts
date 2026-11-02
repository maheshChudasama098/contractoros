import { NextResponse } from "next/server";
import { parseBody, tenantRoute } from "@server/core/http/handler";
import { customerService } from "@server/modules/customers";
import { CustomerInput } from "@shared/contracts/customers";

type P = { customerId: string };

export const GET = tenantRoute<P>(async ({ ctx, params }) => customerService.get(ctx, params.customerId));

export const PUT = tenantRoute<P>(async ({ req, ctx, params }) =>
  customerService.update(ctx, params.customerId, await parseBody(req, CustomerInput)),
);

export const DELETE = tenantRoute<P>(async ({ ctx, params }) => {
  await customerService.remove(ctx, params.customerId);
  return new NextResponse(null, { status: 204 });
});
