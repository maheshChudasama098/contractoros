import { NextResponse } from "next/server";
import { parseBody, parseQuery, tenantRoute } from "@server/core/http/handler";
import { eventService } from "@server/modules/projects";
import { EventRangeQuery, ProjectEventInput } from "@shared/contracts/project-detail";

type P = { projectId: string };

export const GET = tenantRoute<P>(async ({ req, ctx, params }) => {
  const { from, to } = parseQuery(req, EventRangeQuery);
  return eventService.list(ctx, params.projectId, from, to);
});

export const POST = tenantRoute<P>(async ({ req, ctx, params }) => {
  const event = await eventService.create(ctx, params.projectId, await parseBody(req, ProjectEventInput));
  return NextResponse.json({ data: event }, { status: 201 });
});
