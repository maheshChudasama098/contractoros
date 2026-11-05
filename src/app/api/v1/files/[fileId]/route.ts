import { parseBody, tenantRoute } from "@server/core/http/handler";
import { fileResponse } from "@server/core/http/file-response";
import { fileLibraryService } from "@server/modules/files";
import { LibraryFilePatch } from "@shared/contracts/files";

type P = { fileId: string };

export const GET = tenantRoute<P>(async ({ req, ctx, params }) => {
  const f = await fileLibraryService.download(ctx, params.fileId);
  const download = req.nextUrl.searchParams.get("download") === "1";
  return fileResponse(f.body, f.mimeType, f.filename, f.inline && !download);
});

export const PATCH = tenantRoute<P>(async ({ req, ctx, params }) =>
  fileLibraryService.updateFile(ctx, params.fileId, await parseBody(req, LibraryFilePatch)),
);

export const DELETE = tenantRoute<P>(async ({ ctx, params }) => {
  await fileLibraryService.removeFile(ctx, params.fileId);
  return { deleted: true };
});
