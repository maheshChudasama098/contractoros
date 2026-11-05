import CalendarMonthOutlined from "@mui/icons-material/CalendarMonthOutlined";
import AdminPanelSettingsOutlined from "@mui/icons-material/AdminPanelSettingsOutlined";
import DashboardOutlined from "@mui/icons-material/DashboardOutlined";
import FolderOutlined from "@mui/icons-material/FolderOutlined";
import ReceiptLongOutlined from "@mui/icons-material/ReceiptLongOutlined";
import RequestQuoteOutlined from "@mui/icons-material/RequestQuoteOutlined";
import MarkEmailReadOutlined from "@mui/icons-material/MarkEmailReadOutlined";
import HistoryEduOutlined from "@mui/icons-material/HistoryEduOutlined";
import HomeOutlined from "@mui/icons-material/HomeOutlined";
import ManageAccountsOutlined from "@mui/icons-material/ManageAccountsOutlined";
import SettingsOutlined from "@mui/icons-material/SettingsOutlined";
import TuneOutlined from "@mui/icons-material/TuneOutlined";
import PeopleOutline from "@mui/icons-material/PeopleOutline";
import type { ReactNode } from "react";

export type NavItem = { href: string; label: string; icon: ReactNode; count?: number; attention?: boolean };
export type NavGroup = { label?: string; items: NavItem[]; bottom?: boolean; superAdminOnly?: boolean };

export const NAV: NavGroup[] = [
  { items: [{ href: "/dashboard", label: "Dashboard", icon: <DashboardOutlined /> }] },
  {
    label: "Sales",
    items: [
      { href: "/customers", label: "Customers", icon: <PeopleOutline /> },
      { href: "/estimates", label: "Estimates", icon: <RequestQuoteOutlined /> },
      { href: "/proposals", label: "Proposals", icon: <MarkEmailReadOutlined /> },
      { href: "/contracts", label: "Contracts", icon: <HistoryEduOutlined /> },
    ],
  },
  {
    label: "Delivery",
    items: [
      { href: "/projects", label: "Projects", icon: <HomeOutlined /> },
      { href: "/calendar", label: "Calendar", icon: <CalendarMonthOutlined /> },
      { href: "/files", label: "Files", icon: <FolderOutlined /> },
    ],
  },
  { label: "Finance", items: [{ href: "/invoices", label: "Invoices", icon: <ReceiptLongOutlined /> }] },
  {
    label: "Auth",
    items: [
      { href: "/users", label: "Users", icon: <ManageAccountsOutlined /> },
      { href: "/roles", label: "Roles", icon: <AdminPanelSettingsOutlined /> },
      { href: "/settings", label: "Settings", icon: <SettingsOutlined /> },
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
