import { AppShell } from "@web/components/layout/AppShell";
import { authService } from "@server/core/auth/auth.service";
import { requireAppAccess } from "@server/core/auth/guards";

// Session cookie is read per request, so this layout is always dynamic.
export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireAppAccess();
  const me = await authService.me();
  return <AppShell user={{ name: me.name, email: me.email, isSuperAdmin: me.isSuperAdmin }}>{children}</AppShell>;
}
