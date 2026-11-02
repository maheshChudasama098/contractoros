import { AcceptInviteView } from "@web/features/auth/AuthViews";

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <AcceptInviteView token={token} />;
}
