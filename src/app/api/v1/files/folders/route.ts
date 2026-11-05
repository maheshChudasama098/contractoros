import { parseBody, tenantRoute } from "@server/core/http/handler";
import { fileLibraryService } from "@server/modules/files";
import { FolderInput } from "@shared/contracts/files";

export const GET = tenantRoute(async ({ ctx }) => fileLibraryService.tree(ctx));

export const POST = tenantRoute(async ({ req, ctx }) => fileLibraryService.createFolder(ctx, await parseBody(req, FolderInput)));
