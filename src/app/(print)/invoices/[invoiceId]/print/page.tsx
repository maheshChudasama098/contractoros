import { InvoicePrintView } from "@web/features/invoices/InvoicePrintView";

export default async function Page({ params }: { params: Promise<{ invoiceId: string }> }) {
  const { invoiceId } = await params;
  return <InvoicePrintView id={invoiceId} />;
}
