import { NextResponse } from "next/server";
import { parseBody, tenantRoute } from "@server/core/http/handler";
import { taskService } from "@server/modules/projects";
import { TaskInput } from "@shared/contracts/project-detail";

type P = { projectId: string; taskId: string };

export const PUT = tenantRoute<P>(async ({ req, ctx, params }) =>
  taskService.update(ctx, params.projectId, params.taskId, await parseBody(req, TaskInput)),
);

export const DELETE = tenantRoute<P>(async ({ ctx, params }) => {
  await taskService.remove(ctx, params.projectId, params.taskId);
  return new NextResponse(null, { status: 204 });
});
