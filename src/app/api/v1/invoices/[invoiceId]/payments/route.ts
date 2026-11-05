import { parseBody, tenantRoute } from "@server/core/http/handler";
import { invoiceService } from "@server/modules/invoices";
import { RecordPaymentInput } from "@shared/contracts/invoices";

type P = { invoiceId: string };

export const GET = tenantRoute<P>(async ({ ctx, params }) => (await invoiceService.get(ctx, params.invoiceId)).payments);

/** Records an offline payment (cash, check, bank transfer…). */
export const POST = tenantRoute<P>(async ({ req, ctx, params }) =>
  invoiceService.recordPayment(ctx, params.invoiceId, await parseBody(req, RecordPaymentInput)),
);
