import { NextResponse } from "next/server";
import { parseBody, tenantRoute } from "@server/core/http/handler";
import { noteService } from "@server/modules/projects";
import { NoteInput } from "@shared/contracts/project-detail";

type P = { projectId: string };

export const GET = tenantRoute<P>(async ({ ctx, params }) => noteService.list(ctx, params.projectId));

export const POST = tenantRoute<P>(async ({ req, ctx, params }) => {
  const { body } = await parseBody(req, NoteInput);
  return NextResponse.json({ data: await noteService.create(ctx, params.projectId, body) }, { status: 201 });
});
