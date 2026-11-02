import { AppShell } from "@web/components/layout/AppShell";

// TODO(COS-005): redirect to /login when there is no session.
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
