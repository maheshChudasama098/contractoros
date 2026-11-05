import { parseBody, parseQuery, tenantRoute } from "@server/core/http/handler";
import { invoiceService } from "@server/modules/invoices";
import { InvoiceInput, InvoiceListQuery } from "@shared/contracts/invoices";

export const GET = tenantRoute(async ({ req, ctx }) => invoiceService.list(ctx, parseQuery(req, InvoiceListQuery)));

export const POST = tenantRoute(async ({ req, ctx }) => invoiceService.create(ctx, await parseBody(req, InvoiceInput)));
