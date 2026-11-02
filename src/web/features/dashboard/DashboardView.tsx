"use client";

import AccessTimeOutlined from "@mui/icons-material/AccessTimeOutlined";
import CompareArrowsOutlined from "@mui/icons-material/CompareArrowsOutlined";
import DrawOutlined from "@mui/icons-material/DrawOutlined";
import ReceiptLongOutlined from "@mui/icons-material/ReceiptLongOutlined";
import SyncProblemOutlined from "@mui/icons-material/SyncProblemOutlined";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Link from "next/link";
import { useState } from "react";
import {
  IconTile,
  InitialsAvatar,
  KpiStrip,
  LinkRow,
  Muted,
  Num,
  PageHeader,
  Progress,
  SectionCard,
  Segmented,
  SplitLayout,
  StatusTag,
  TwoLine,
} from "@web/components/ui";
import { tokens, type Tone } from "@web/theme/tokens";

const ATTENTION: { tone: Tone; icon: React.ReactNode; title: string; sub: string; value: React.ReactNode; href: string }[] = [
  { tone: "warning", icon: <CompareArrowsOutlined />, title: "CO-004 awaiting customer approval", sub: "Shah Kitchen · Relocate range gas line · sent 2 days ago", value: <Num>+$1,840</Num>, href: "/change-orders" },
  { tone: "danger", icon: <AccessTimeOutlined />, title: "INV-3099 is 12 days overdue", sub: "Rosa Delgado · Deck & Patio progress invoice", value: <Num>$6,825.00</Num>, href: "/invoices/inv-3099" },
  { tone: "info", icon: <DrawOutlined />, title: "CT-0188 viewed, not yet signed", sub: "Sofia Marquez · Kitchen remodel · viewed 3 times", value: <Num>$93,140</Num>, href: "/proposals/ct-0188" },
  { tone: "warning", icon: <SyncProblemOutlined />, title: "1 QuickBooks record failed to sync", sub: "Payment on INV-3108 · customer mapping conflict", value: <Box sx={{ color: tokens.brand, fontSize: 13, fontWeight: 500 }}>Resolve</Box>, href: "/integrations" },
  { tone: "neutral", icon: <ReceiptLongOutlined />, title: "Deposit invoice ready to issue", sub: "Whitaker Basement · INV-3110 draft · project starts Nov 9", value: <Num>$19,260.00</Num>, href: "/invoices" },
];

const ACTIVE = [
  { name: "Shah Kitchen Remodel", sub: "P-1042 · Marcus Bell", status: ["Active", "success"], pct: 58, next: "Cabinet install · Nov 4", value: "$89,650", href: "/projects/p-1042" },
  { name: "Okafor Primary Bath", sub: "P-1039 · Marcus Bell", status: ["Active", "success"], pct: 34, next: "Shower pan inspection · Nov 3", value: "$38,900", href: "/projects/p-1039" },
  { name: "Whitaker Basement Finish", sub: "P-1045 · Marcus Bell", status: ["Scheduled", "info"], pct: 0, next: "Demo & prep · Nov 9", value: "$64,200", href: "/projects/p-1045" },
  { name: "Delgado Deck & Patio", sub: "P-1036 · Tomás Reyes", status: ["On hold", "warning"], pct: 45, next: "Waiting on HOA approval", value: "$22,750", href: "/projects/p-1036", color: "#C79A3E" },
] as const;

const TODAY = [
  ["7:30", "Paint ceiling — Shah", "Crew A · Tomás, Jordan"],
  ["9:00", "Waterproofing — Okafor", "Crew B · Luis Ramos"],
  ["2:00", "Site walk — Adeyemi", "Lena Ortiz · estimate measurements"],
];

const FOLLOWUPS = [
  { name: "Sofia Marquez", sub: "Call about contract · 10:00", when: "Today", tone: "danger" as Tone, href: "/leads/sofia-marquez" },
  { name: "Amara Diallo", sub: "Book site visit · 2:30", when: "Today", tone: "danger" as Tone, href: "/leads/amara-diallo" },
  { name: "Ruth Adeyemi", sub: "Send estimate v1", when: "Fri", tone: "neutral" as Tone, href: "/leads/ruth-adeyemi" },
];

export function DashboardView() {
  const [period, setPeriod] = useState<"week" | "month" | "quarter">("month");
  return (
    <>
      <PageHeader
        eyebrow="Thursday, October 29"
        title="Good morning, Dana"
        actions={
          <Segmented
            label="Period"
            value={period}
            onChange={setPeriod}
            options={[
              { value: "week", label: "Week" },
              { value: "month", label: "Month" },
              { value: "quarter", label: "Quarter" },
            ]}
          />
        }
      />

      <KpiStrip
        items={[
          { label: "Open pipeline", value: "$459,000", hint: "7 leads · 2 follow-ups due today" },
          { label: "Contracted this month", value: "$64,200", hint: "1 proposal accepted · 1 awaiting signature" },
          { label: "Outstanding receivables", value: "$20,995", hint: "$6,825 overdue", hintTone: "danger" },
          { label: "Collected in October", value: "$30,960", hint: "3 payments via Stripe" },
        ]}
      />

      <SplitLayout
        sideWidth={380}
        main={
          <>
            <SectionCard title="Needs your attention" action={<StatusTag tone="brand">5 items</StatusTag>}>
              {ATTENTION.map((a, i) => (
                <LinkRow key={a.title} href={a.href} last={i === ATTENTION.length - 1}>
                  <IconTile tone={a.tone}>{a.icon}</IconTile>
                  <TwoLine title={a.title} sub={a.sub} />
                  <Box sx={{ fontWeight: 500 }}>{a.value}</Box>
                </LinkRow>
              ))}
            </SectionCard>

            <SectionCard title="Active work" action={<Link href="/projects">All projects</Link>}>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Project</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell sx={{ width: 200 }}>Progress</TableCell>
                      <TableCell>Next milestone</TableCell>
                      <TableCell align="right">Contract</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {ACTIVE.map((p) => (
                      <TableRow key={p.name} hover>
                        <TableCell>
                          <TwoLine title={p.name} sub={p.sub} href={p.href} />
                        </TableCell>
                        <TableCell>
                          <StatusTag tone={p.status[1]}>{p.status[0]}</StatusTag>
                        </TableCell>
                        <TableCell>
                          <Progress value={p.pct} color={"color" in p ? p.color : undefined} />
                        </TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>{p.next}</TableCell>
                        <TableCell align="right">
                          <Num>{p.value}</Num>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </SectionCard>
          </>
        }
        side={
          <>
            <SectionCard title="Today on site" action={<Link href="/schedule">Schedule</Link>} bodySx={{ px: 2.5, pt: 1, pb: 2 }}>
              {TODAY.map(([t, title, sub], i) => (
                <Stack key={title} direction="row" gap={1.5} sx={{ py: 1.25, borderBottom: i < TODAY.length - 1 ? `1px solid ${tokens.rowDivider}` : 0 }}>
                  <Num sx={{ width: 44, fontSize: 12, color: "text.secondary", pt: "2px" }}>{t}</Num>
                  <TwoLine title={title} sub={sub} />
                </Stack>
              ))}
            </SectionCard>

            <SectionCard title="Follow-ups due" action={<Link href="/leads">Pipeline</Link>}>
              {FOLLOWUPS.map((f, i) => (
                <LinkRow key={f.name} href={f.href} last={i === FOLLOWUPS.length - 1}>
                  <InitialsAvatar name={f.name} />
                  <TwoLine title={f.name} sub={f.sub} />
                  <StatusTag tone={f.tone}>{f.when}</StatusTag>
                </LinkRow>
              ))}
            </SectionCard>

            <SectionCard title="Receivables aging" action={<Link href="/reports">Report</Link>} bodySx={{ px: 2.5, pt: 2, pb: 2.25 }}>
              <Stack gap={1.75}>
                <Stack direction="row" gap="2px" sx={{ height: 10, borderRadius: "5px", overflow: "hidden" }}>
                  <Box sx={{ flex: 67.5, bgcolor: tokens.brand }} />
                  <Box sx={{ flex: 32.5, bgcolor: "#7F1D1D" }} />
                </Stack>
                {[
                  ["Current", "$14,170", tokens.brand],
                  ["1–30 days overdue", "$6,825", "#7F1D1D"],
                  ["31+ days overdue", "$0", "#C9C7BF"],
                ].map(([l, v, c]) => (
                  <Stack key={l} direction="row" justifyContent="space-between" sx={{ fontSize: 13 }}>
                    <Stack direction="row" alignItems="center" gap={1}>
                      <Box sx={{ width: 8, height: 8, borderRadius: "2px", bgcolor: c }} />
                      {l}
                    </Stack>
                    {v === "$0" ? <Muted><Num>{v}</Num></Muted> : <Num>{v}</Num>}
                  </Stack>
                ))}
              </Stack>
            </SectionCard>
          </>
        }
      />
    </>
  );
}
