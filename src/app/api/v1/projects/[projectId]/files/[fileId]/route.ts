import { NextResponse } from "next/server";
import { tenantRoute } from "@server/core/http/handler";
import { fileResponse } from "@server/core/http/file-response";
import { projectFileService } from "@server/modules/projects";

type P = { projectId: string; fileId: string };

export const GET = tenantRoute<P>(async ({ req, ctx, params }) => {
  const f = await projectFileService.download(ctx, params.projectId, params.fileId);
  const download = req.nextUrl.searchParams.get("download") === "1";
  return fileResponse(f.body, f.mimeType, f.filename, f.inline && !download);
});

export const DELETE = tenantRoute<P>(async ({ ctx, params }) => {
  await projectFileService.remove(ctx, params.projectId, params.fileId);
  return new NextResponse(null, { status: 204 });
});
