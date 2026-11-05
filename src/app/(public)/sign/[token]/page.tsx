import { PortalSignView } from "@web/features/portal/PortalViews";

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <PortalSignView token={token} />;
}
