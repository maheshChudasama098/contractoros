import { ContractDetailView } from "@web/features/contracts/ContractDetailView";

export default async function Page({ params }: { params: Promise<{ contractId: string }> }) {
  const { contractId } = await params;
  return <ContractDetailView id={contractId} />;
}
