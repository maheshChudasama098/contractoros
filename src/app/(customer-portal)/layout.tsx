import type { Metadata } from "next";

// Spec §13: portal pages must not be indexed and must not load third-party scripts.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return children;
}
