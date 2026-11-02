import { NextResponse } from "next/server";
import { parseBody, tenantRoute } from "@server/core/http/handler";
import { eventService } from "@server/modules/projects";
import { ProjectEventInput } from "@shared/contracts/project-detail";

type P = { projectId: string; eventId: string };

export const PUT = tenantRoute<P>(async ({ req, ctx, params }) =>
  eventService.update(ctx, params.projectId, params.eventId, await parseBody(req, ProjectEventInput)),
);

export const DELETE = tenantRoute<P>(async ({ ctx, params }) => {
  await eventService.remove(ctx, params.projectId, params.eventId);
  return new NextResponse(null, { status: 204 });
});
