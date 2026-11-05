import type { Metadata } from "next";

// Customer-facing token pages: no login, never indexed.
export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return children;
}
