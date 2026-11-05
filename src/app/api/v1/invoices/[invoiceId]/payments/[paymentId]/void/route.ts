import { parseBody, tenantRoute } from "@server/core/http/handler";
import { invoiceService } from "@server/modules/invoices";
import { VoidInput } from "@shared/contracts/invoices";

export const POST = tenantRoute<{ invoiceId: string; paymentId: string }>(async ({ req, ctx, params }) =>
  invoiceService.voidPayment(ctx, params.invoiceId, params.paymentId, (await parseBody(req, VoidInput)).reason),
);
