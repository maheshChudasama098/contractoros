import { parseBody, tenantRoute } from "@server/core/http/handler";
import { invoiceService } from "@server/modules/invoices";
import { VoidInput } from "@shared/contracts/invoices";

export const POST = tenantRoute<{ invoiceId: string }>(async ({ req, ctx, params }) =>
  invoiceService.void(ctx, params.invoiceId, (await parseBody(req, VoidInput)).reason),
);
