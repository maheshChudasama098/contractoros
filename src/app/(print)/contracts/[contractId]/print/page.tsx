import { ContractPrintView } from "@web/features/estimates/PrintViews";

export default async function Page({ params }: { params: Promise<{ contractId: string }> }) {
  const { contractId } = await params;
  return <ContractPrintView id={contractId} />;
}
