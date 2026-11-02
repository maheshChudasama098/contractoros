import { Errors } from "@server/core/http/errors";
import { tenantRoute } from "@server/core/http/handler";
import { fileResponse } from "@server/core/http/file-response";
import { expenseService } from "@server/modules/projects";

type P = { projectId: string; expenseId: string };

export const GET = tenantRoute<P>(async ({ ctx, params }) => {
  const f = await expenseService.receipt(ctx, params.projectId, params.expenseId);
  return fileResponse(f.body, f.mimeType, f.filename, true);
});

export const POST = tenantRoute<P>(async ({ req, ctx, params }) => {
  const file = (await req.formData().catch(() => null))?.get("receipt");
  if (!(file instanceof File)) throw Errors.validation({ receipt: ["Choose a file to upload."] });
  return expenseService.attachReceipt(ctx, params.projectId, params.expenseId, file);
});
