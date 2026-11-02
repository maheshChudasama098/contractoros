import { parseBody, parseQuery, tenantRoute } from "@server/core/http/handler";
import { leadService } from "@server/modules/leads";
import { CreateLeadInput, ListLeadsQuery } from "@shared/contracts/leads";
import { NextResponse } from "next/server";

// Thin HTTP adapter: parse -> call service -> return. No business logic here.
export const GET = tenantRoute(async ({ req, ctx }) => leadService.list(ctx, parseQuery(req, ListLeadsQuery)));

export const POST = tenantRoute(async ({ req, ctx }) => {
  const lead = await leadService.create(ctx, await parseBody(req, CreateLeadInput));
  return NextResponse.json({ data: lead }, { status: 201 });
});
