import { PortalDocs } from "@web/features/portal/PortalViews";

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  // TODO(M12): resolve hashed token via server/modules/customer-portal; redirect to /portal/expired when revoked.
  const { token } = await params;
  return <PortalDocs token={token} />;
}
