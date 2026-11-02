"use client";

import AccessTimeOutlined from "@mui/icons-material/AccessTimeOutlined";
import CompareArrowsOutlined from "@mui/icons-material/CompareArrowsOutlined";
import CreditCardOffOutlined from "@mui/icons-material/CreditCardOffOutlined";
import DrawOutlined from "@mui/icons-material/DrawOutlined";
import PaidOutlined from "@mui/icons-material/PaidOutlined";
import SyncProblemOutlined from "@mui/icons-material/SyncProblemOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Link from "next/link";
import { useState } from "react";
import { IconTile, InitialsAvatar, Muted, PageHeader, Segmented } from "@web/components/ui";
import { tokens, type Tone } from "@web/theme/tokens";

type Kind = "action" | "payment" | "mention" | "info";
type Note = { group: string; href: string; icon?: React.ReactNode; tone?: Tone; avatar?: string; title: string; rest: string; meta: string; kind: Kind; unread?: boolean };

const NOTES: Note[] = [
  { group: "Today", href: "/invoices/inv-3108", icon: <PaidOutlined />, tone: "success", title: "Payment received", rest: " · $15,000.00 on INV-3108 from Priya Shah", meta: "Shah Kitchen Remodel · 8:14 AM", kind: "payment", unread: true },
  { group: "Today", href: "/integrations", icon: <SyncProblemOutlined />, tone: "warning", title: "QuickBooks sync failed", rest: " · payment on INV-3108 needs a customer match", meta: "Integrations · 9:02 AM", kind: "action", unread: true },
  { group: "Today", href: "/proposals/ct-0188", icon: <DrawOutlined />, tone: "info", title: "Sofia Marquez viewed", rest: " contract CT-0188 — still unsigned", meta: "Proposals · 7:42 AM", kind: "action", unread: true },
  { group: "Yesterday", href: "/projects/p-1042", avatar: "Marcus Bell", title: "Marcus Bell", rest: " posted an update to Shah Kitchen Remodel", meta: "“Drywall is patched and primed…” · 5:10 PM", kind: "mention" },
  { group: "Yesterday", href: "/tasks", icon: <AccessTimeOutlined />, tone: "danger", title: "Task blocked", rest: " · Set island base cabinets is waiting on CO-004", meta: "Shah Kitchen Remodel · 3:48 PM", kind: "action" },
  { group: "Earlier", href: "/change-orders", icon: <CompareArrowsOutlined />, tone: "neutral", title: "CO-004 sent", rest: " to Priya Shah for approval", meta: "Oct 27 · 4:52 PM", kind: "info" },
  { group: "Earlier", href: "/invoices/inv-3108", icon: <CreditCardOffOutlined />, tone: "danger", title: "Payment failed", rest: " · card declined on INV-3108", meta: "Oct 25 · 6:47 PM", kind: "payment" },
];

type Filter = "all" | "action" | "payment" | "mention";

export function NotificationsView() {
  const [filter, setFilter] = useState<Filter>("all");
  const [read, setRead] = useState(false);
  const list = NOTES.filter((n) => filter === "all" || n.kind === filter);
  const unread = read ? 0 : NOTES.filter((n) => n.unread).length;
  const groups = [...new Set(list.map((n) => n.group))];

  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle={unread ? `${unread} unread` : "You're all caught up"}
        actions={
          <>
            <Button component={Link} href="/profile">
              Preferences
            </Button>
            <Button onClick={() => setRead(true)} disabled={!unread}>
              Mark all as read
            </Button>
          </>
        }
      />
      <Box>
        <Segmented
          label="Filter"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All" },
            { value: "action", label: "Needs action" },
            { value: "payment", label: "Payments" },
            { value: "mention", label: "Mentions" },
          ]}
        />
      </Box>
      <Card component="section" aria-label="Notification list">
        {groups.map((g) => (
          <Box key={g}>
            <Box sx={{ px: 2.5, py: 1, bgcolor: tokens.surfaceMuted, borderBottom: `1px solid ${tokens.divider}`, fontSize: 12, fontWeight: 500, color: "text.secondary" }}>{g}</Box>
            {list
              .filter((n) => n.group === g)
              .map((n, i) => (
                <Box
                  key={i}
                  component={Link}
                  href={n.href}
                  sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 2.5, py: 1.75, color: tokens.ink, borderBottom: `1px solid ${tokens.rowDivider}`, bgcolor: n.unread && !read ? "#FFFCFA" : "#fff", "&:hover": { bgcolor: tokens.surfaceMuted, color: tokens.ink } }}
                >
                  {n.avatar ? <InitialsAvatar name={n.avatar} size={32} /> : <IconTile tone={n.tone}>{n.icon}</IconTile>}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box>
                      <strong style={{ fontWeight: 600 }}>{n.title}</strong>
                      {n.rest}
                    </Box>
                    <Muted sx={{ fontSize: 13 }}>{n.meta}</Muted>
                  </Box>
                  {n.unread && !read && <Box aria-label="Unread" sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: tokens.brand, flex: "none" }} />}
                </Box>
              ))}
          </Box>
        ))}
        {list.length === 0 && <Box sx={{ p: 5, textAlign: "center", color: "text.secondary" }}>Nothing here.</Box>}
      </Card>
    </>
  );
}
