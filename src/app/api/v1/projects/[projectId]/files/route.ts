import { NextResponse } from "next/server";
import { Errors } from "@server/core/http/errors";
import { tenantRoute } from "@server/core/http/handler";
import { projectFileService } from "@server/modules/projects";

type P = { projectId: string };

export const GET = tenantRoute<P>(async ({ ctx, params }) => projectFileService.list(ctx, params.projectId));

export const POST = tenantRoute<P>(async ({ req, ctx, params }) => {
  const file = (await req.formData().catch(() => null))?.get("file");
  if (!(file instanceof File)) throw Errors.validation({ file: ["Choose a file to upload."] });
  return NextResponse.json({ data: await projectFileService.upload(ctx, params.projectId, file) }, { status: 201 });
});
