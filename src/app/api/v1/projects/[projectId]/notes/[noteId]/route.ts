import { NextResponse } from "next/server";
import { tenantRoute } from "@server/core/http/handler";
import { noteService } from "@server/modules/projects";

type P = { projectId: string; noteId: string };

export const DELETE = tenantRoute<P>(async ({ ctx, params }) => {
  await noteService.remove(ctx, params.projectId, params.noteId);
  return new NextResponse(null, { status: 204 });
});
