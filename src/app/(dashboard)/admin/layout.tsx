import { requireSuperAdmin } from "@server/core/auth/guards";

// Platform admin area: super admins only.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireSuperAdmin();
  return children;
}
