import { NextResponse } from "next/server";
import { parseBody, parseQuery, tenantRoute } from "@server/core/http/handler";
import { projectService } from "@server/modules/projects";
import { ProjectInput, ProjectListQuery } from "@shared/contracts/projects";

export const GET = tenantRoute(async ({ req, ctx }) => projectService.list(ctx, parseQuery(req, ProjectListQuery)));

export const POST = tenantRoute(async ({ req, ctx }) => {
  const project = await projectService.create(ctx, await parseBody(req, ProjectInput));
  return NextResponse.json({ data: project }, { status: 201 });
});
