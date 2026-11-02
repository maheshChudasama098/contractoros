import { NextResponse } from "next/server";
import { parseBody, tenantRoute } from "@server/core/http/handler";
import { projectService } from "@server/modules/projects";
import { ProjectInput } from "@shared/contracts/projects";

type P = { projectId: string };

export const GET = tenantRoute<P>(async ({ ctx, params }) => projectService.get(ctx, params.projectId));

export const PUT = tenantRoute<P>(async ({ req, ctx, params }) =>
  projectService.update(ctx, params.projectId, await parseBody(req, ProjectInput)),
);

export const DELETE = tenantRoute<P>(async ({ ctx, params }) => {
  await projectService.remove(ctx, params.projectId);
  return new NextResponse(null, { status: 204 });
});
