import { InvoiceView } from "@web/features/invoices/InvoiceView";

export default async function Page({ params }: { params: Promise<{ invoiceId: string }> }) {
  const { invoiceId } = await params;
  return <InvoiceView id={invoiceId} />;
}
