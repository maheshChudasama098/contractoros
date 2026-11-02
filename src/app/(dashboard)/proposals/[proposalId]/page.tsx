import { ProposalView } from "@web/features/proposals/ProposalView";

export default async function Page({ params }: { params: Promise<{ proposalId: string }> }) {
  const { proposalId } = await params;
  return <ProposalView id={proposalId} />;
}
