import { parseBody, tenantRoute } from "@server/core/http/handler";
import { fileLibraryService } from "@server/modules/files";
import { FolderPatch } from "@shared/contracts/files";

type P = { folderId: string };

export const PATCH = tenantRoute<P>(async ({ req, ctx, params }) =>
  fileLibraryService.updateFolder(ctx, params.folderId, await parseBody(req, FolderPatch)),
);

export const DELETE = tenantRoute<P>(async ({ ctx, params }) => fileLibraryService.removeFolder(ctx, params.folderId));
