import { parseBody, tenantRoute } from "@server/core/http/handler";
import { invoiceService } from "@server/modules/invoices";
import { InvoiceInput } from "@shared/contracts/invoices";

type P = { invoiceId: string };

export const GET = tenantRoute<P>(async ({ ctx, params }) => invoiceService.get(ctx, params.invoiceId));

/** Draft only. Issued invoices are immutable; void and reissue instead. */
export const PUT = tenantRoute<P>(async ({ req, ctx, params }) =>
  invoiceService.update(ctx, params.invoiceId, await parseBody(req, InvoiceInput)),
);

export const DELETE = tenantRoute<P>(async ({ ctx, params }) => {
  await invoiceService.remove(ctx, params.invoiceId);
  return { deleted: true };
});
