import AdminPanelSettingsOutlined from "@mui/icons-material/AdminPanelSettingsOutlined";
import DashboardOutlined from "@mui/icons-material/DashboardOutlined";
import HomeOutlined from "@mui/icons-material/HomeOutlined";
import ManageAccountsOutlined from "@mui/icons-material/ManageAccountsOutlined";
import TuneOutlined from "@mui/icons-material/TuneOutlined";
import PeopleOutline from "@mui/icons-material/PeopleOutline";
import type { ReactNode } from "react";

export type NavItem = { href: string; label: string; icon: ReactNode; count?: number; attention?: boolean };
export type NavGroup = { label?: string; items: NavItem[]; bottom?: boolean; superAdminOnly?: boolean };

export const NAV: NavGroup[] = [
  { items: [{ href: "/dashboard", label: "Dashboard", icon: <DashboardOutlined /> }] },
  { label: "Sales", items: [{ href: "/customers", label: "Customers", icon: <PeopleOutline /> }] },
  { label: "Delivery", items: [{ href: "/projects", label: "Projects", icon: <HomeOutlined /> }] },
  {
    label: "Auth",
    items: [
      { href: "/users", label: "Users", icon: <ManageAccountsOutlined /> },
      { href: "/roles", label: "Roles", icon: <AdminPanelSettingsOutlined /> },
    ],
  },
  {
    label: "Admin",
    superAdminOnly: true,
    items: [{ href: "/admin/masters", label: "Master data", icon: <TuneOutlined /> }],
  },
];

export const BOTTOM_NAV = [
  { href: "/dashboard", label: "Home", icon: <DashboardOutlined /> },
  { href: "/customers", label: "Customers", icon: <PeopleOutline /> },
  { href: "/projects", label: "Projects", icon: <HomeOutlined /> },
];

/** Breadcrumb labels for top-level segments. */
export const SECTION_LABELS: Record<string, string> = Object.fromEntries(
  NAV.flatMap((g) => g.items).map((i) => [i.href.slice(1), i.label]),
);
Object.assign(SECTION_LABELS, { profile: "Profile", "change-password": "Change password", admin: "Admin" });
