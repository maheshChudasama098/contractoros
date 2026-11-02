import { CustomerView } from "@web/features/customers/CustomerView";

export default async function Page({ params }: { params: Promise<{ customerId: string }> }) {
  const { customerId } = await params;
  return <CustomerView id={customerId} />;
}
