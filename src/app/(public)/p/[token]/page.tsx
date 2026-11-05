import { PortalProposalView } from "@web/features/portal/PortalViews";

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <PortalProposalView token={token} />;
}
