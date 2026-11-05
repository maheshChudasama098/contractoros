import { Errors } from "@server/core/http/errors";
import { parseQuery, tenantRoute } from "@server/core/http/handler";
import { fileLibraryService } from "@server/modules/files";
import { FileBrowseQuery } from "@shared/contracts/files";

export const GET = tenantRoute(async ({ req, ctx }) => fileLibraryService.browse(ctx, parseQuery(req, FileBrowseQuery)));

/** Multipart: one `file` per request (the UI uploads several in sequence) plus optional `folder_id`. */
export const POST = tenantRoute(async ({ req, ctx }) => {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) throw Errors.validation({ file: ["Choose a file to upload."] });
  const folderId = form?.get("folder_id");
  return fileLibraryService.upload(ctx, typeof folderId === "string" && folderId ? folderId : null, file);
});
