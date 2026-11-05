import { tenantRoute } from "@server/core/http/handler";
import { invoiceService } from "@server/modules/invoices";

export const POST = tenantRoute<{ invoiceId: string }>(async ({ ctx, params }) => invoiceService.issue(ctx, params.invoiceId));
