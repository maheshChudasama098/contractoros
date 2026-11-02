import { NextResponse } from "next/server";
import { parseBody, tenantRoute } from "@server/core/http/handler";
import { taskService } from "@server/modules/projects";
import { TaskInput } from "@shared/contracts/project-detail";

type P = { projectId: string };

export const GET = tenantRoute<P>(async ({ ctx, params }) => taskService.list(ctx, params.projectId));

export const POST = tenantRoute<P>(async ({ req, ctx, params }) => {
  const task = await taskService.create(ctx, params.projectId, await parseBody(req, TaskInput));
  return NextResponse.json({ data: task }, { status: 201 });
});
