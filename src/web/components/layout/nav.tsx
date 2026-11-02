import AdminPanelSettingsOutlined from "@mui/icons-material/AdminPanelSettingsOutlined";
import AssessmentOutlined from "@mui/icons-material/AssessmentOutlined";
import CalendarMonthOutlined from "@mui/icons-material/CalendarMonthOutlined";
import CompareArrowsOutlined from "@mui/icons-material/CompareArrowsOutlined";
import DashboardOutlined from "@mui/icons-material/DashboardOutlined";
import DescriptionOutlined from "@mui/icons-material/DescriptionOutlined";
import DrawOutlined from "@mui/icons-material/DrawOutlined";
import ExtensionOutlined from "@mui/icons-material/ExtensionOutlined";
import FilterAltOutlined from "@mui/icons-material/FilterAltOutlined";
import FolderOutlined from "@mui/icons-material/FolderOutlined";
import GroupAddOutlined from "@mui/icons-material/GroupAddOutlined";
import ManageAccountsOutlined from "@mui/icons-material/ManageAccountsOutlined";
import HomeOutlined from "@mui/icons-material/HomeOutlined";
import PeopleOutline from "@mui/icons-material/PeopleOutline";
import ReceiptLongOutlined from "@mui/icons-material/ReceiptLongOutlined";
import TaskAltOutlined from "@mui/icons-material/TaskAltOutlined";
import TuneOutlined from "@mui/icons-material/TuneOutlined";
import type { ReactNode } from "react";

export type NavItem = { href: string; label: string; icon: ReactNode; count?: number; attention?: boolean };
export type NavGroup = { label?: string; items: NavItem[]; bottom?: boolean };

export const NAV: NavGroup[] = [
  { items: [{ href: "/dashboard", label: "Dashboard", icon: <DashboardOutlined /> }] },
  {
    label: "Sales",
    items: [
      { href: "/leads", label: "Leads", icon: <FilterAltOutlined />, count: 7 },
      { href: "/customers", label: "Customers", icon: <PeopleOutline /> },
      { href: "/estimates", label: "Estimates", icon: <DescriptionOutlined /> },
      { href: "/proposals", label: "Proposals & contracts", icon: <DrawOutlined /> },
    ],
  },
  {
    label: "Delivery",
    items: [
      { href: "/projects", label: "Projects", icon: <HomeOutlined /> },
      { href: "/tasks", label: "Tasks", icon: <TaskAltOutlined /> },
      { href: "/schedule", label: "Schedule", icon: <CalendarMonthOutlined /> },
      { href: "/change-orders", label: "Change orders", icon: <CompareArrowsOutlined />, count: 1 },
    ],
  },
  {
    label: "Finance",
    items: [
      { href: "/invoices", label: "Invoices & payments", icon: <ReceiptLongOutlined /> },
      { href: "/reports", label: "Reports", icon: <AssessmentOutlined /> },
      { href: "/files", label: "Files", icon: <FolderOutlined /> },
    ],
  },
  {
    label: "Auth management",
    items: [
      { href: "/users", label: "Users", icon: <ManageAccountsOutlined /> },
      { href: "/roles", label: "Roles", icon: <AdminPanelSettingsOutlined /> },
    ],
  },
  {
    bottom: true,
    items: [
      { href: "/integrations", label: "Integrations", icon: <ExtensionOutlined />, attention: true },
      { href: "/team", label: "Team & roles", icon: <GroupAddOutlined /> },
      { href: "/settings", label: "Settings", icon: <TuneOutlined /> },
    ],
  },
];

export const BOTTOM_NAV = [
  { href: "/dashboard", label: "Home", icon: <DashboardOutlined /> },
  { href: "/leads", label: "Sales", icon: <FilterAltOutlined /> },
  { href: "/projects", label: "Projects", icon: <HomeOutlined /> },
  { href: "/schedule", label: "Schedule", icon: <CalendarMonthOutlined /> },
];

/** Breadcrumb labels for top-level segments. */
export const SECTION_LABELS: Record<string, string> = Object.fromEntries(
  NAV.flatMap((g) => g.items).map((i) => [i.href.slice(1), i.label]),
);
Object.assign(SECTION_LABELS, { notifications: "Notifications", profile: "Profile" });
