import { requireAppAccess } from "@server/core/auth/guards";

// Print views: same access rules as the app, without the app shell.
export const dynamic = "force-dynamic";

export default async function PrintLayout({ children }: { children: React.ReactNode }) {
  await requireAppAccess();
  return children;
}
