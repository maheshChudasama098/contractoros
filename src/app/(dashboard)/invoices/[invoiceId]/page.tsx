import { InvoiceDetailView } from "@web/features/invoices/InvoiceDetailView";

export default async function Page({ params }: { params: Promise<{ invoiceId: string }> }) {
  const { invoiceId } = await params;
  return <InvoiceDetailView id={invoiceId} />;
}
