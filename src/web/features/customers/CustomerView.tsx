"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useState } from "react";
import { InitialsAvatar, Muted, Num, SectionCard, SplitLayout, StatusTag, TabBar, TwoLine } from "@web/components/ui";
import { customers } from "@web/mocks/data";
import { tokens, type Tone } from "@web/theme/tokens";

const RECORDS: { label: string; href?: string; status: [string, Tone]; updated: string; value: string }[] = [
  { label: "P-1042 · Shah Kitchen Remodel", href: "/projects/p-1042", status: ["Active", "success"], updated: "Today", value: "$89,650.00" },
  { label: "EST-2052 · Kitchen remodel v3", href: "/estimates/est-2052/preview", status: ["Accepted", "success"], updated: "Sep 2", value: "$86,400.00" },
  { label: "EST-2052 · v2", status: ["Superseded", "neutral"], updated: "Aug 24", value: "$91,200.00" },
  { label: "EST-2047 · Primary bath refresh", status: ["Expired", "warning"], updated: "Aug 11", value: "$24,800.00" },
];

type Tab = "overview" | "properties" | "projects" | "estimates" | "invoices" | "activity";

export function CustomerView({ id }: { id: string }) {
  const c = customers.find((x) => x.id === id) ?? customers[0]!;
  const [tab, setTab] = useState<Tab>("overview");

  return (
    <>
      <Stack direction="row" flexWrap="wrap" alignItems="flex-start" justifyContent="space-between" gap={2}>
        <Stack direction="row" gap={2} alignItems="center">
          <InitialsAvatar name={c.name} size={52} />
          <Stack gap={0.5}>
            <Stack direction="row" gap={1.5} alignItems="center" flexWrap="wrap">
              <Typography variant="h1">{c.name}</Typography>
              <StatusTag tone="success">Active customer</StatusTag>
            </Stack>
            <Muted>Household · Customer since Aug 2026 · From referral lead</Muted>
          </Stack>
        </Stack>
        <Stack direction="row" gap={1} flexWrap="wrap">
          <Button>Add property</Button>
          <Button component={Link} href="/invoices/new">
            New invoice
          </Button>
          <Button component={Link} href="/estimates/new" variant="contained" color="primary">
            New estimate
          </Button>
        </Stack>
      </Stack>

      <TabBar
        label="Customer sections"
        value={tab}
        onChange={setTab}
        items={[
          { value: "overview", label: "Overview" },
          { value: "properties", label: "Properties", count: 1 },
          { value: "projects", label: "Projects", count: 1 },
          { value: "estimates", label: "Estimates", count: 3 },
          { value: "invoices", label: "Invoices", count: 2 },
          { value: "activity", label: "Activity" },
        ]}
      />

      <Card component="section" aria-label="Account summary" sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(180px,100%),1fr))" }}>
        {[
          ["Contracted", "$89,650.00"],
          ["Invoiced", "$55,090.00"],
          ["Paid", "$40,920.00"],
          ["Balance due", "$14,170.00"],
        ].map(([k, val], i) => (
          <Stack key={k} gap={0.5} sx={{ px: 2.5, py: 2, borderRight: i < 3 ? `1px solid ${tokens.divider}` : 0 }}>
            <Muted sx={{ fontSize: 13 }}>{k}</Muted>
            <Num sx={{ fontSize: 22, fontWeight: 500, color: k === "Balance due" ? tokens.brand : tokens.ink }}>{val}</Num>
          </Stack>
        ))}
      </Card>

      <SplitLayout
        main={
          <>
            <SectionCard title="Property" action={<a href="#">Edit</a>}>
              <Stack direction={{ xs: "column", sm: "row" }} gap={2.5} sx={{ p: 2.5 }}>
                <Box sx={{ width: { xs: "100%", sm: 200 }, height: 130, borderRadius: "10px", bgcolor: "#E9E7E1", backgroundImage: "repeating-linear-gradient(45deg, transparent 0 10px, rgba(0,0,0,.03) 10px 20px)", flex: "none" }} aria-label="Map placeholder" />
                <Stack gap={1.5}>
                  <TwoLine title="1418 Larkspur Ln" sub="Austin, TX 78704 · Single-family, built 1987" />
                  <Box sx={{ p: 1.5, borderRadius: "10px", bgcolor: "#FDF3DC", color: "#6B3A06", fontSize: 13.5 }}>
                    <Box sx={{ fontWeight: 500, mb: 0.5 }}>Access instructions · internal only</Box>
                    Lockbox on side gate, code shared with crew leads. Dog (friendly) in backyard — keep gate latched. Park on street, not in shared driveway.
                  </Box>
                </Stack>
              </Stack>
            </SectionCard>
            <SectionCard title="Projects & estimates">
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Record</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Updated</TableCell>
                      <TableCell align="right">Value</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {RECORDS.map((r) => (
                      <TableRow key={r.label} hover>
                        <TableCell>{r.href ? <Link href={r.href} style={{ fontWeight: 500 }}>{r.label}</Link> : r.label}</TableCell>
                        <TableCell>
                          <StatusTag tone={r.status[1]}>{r.status[0]}</StatusTag>
                        </TableCell>
                        <TableCell sx={{ color: "text.secondary" }}>{r.updated}</TableCell>
                        <TableCell align="right">
                          <Num>{r.value}</Num>
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
            <SectionCard title="Contacts" action={<a href="#">Add</a>} bodySx={{ p: 2.5, display: "flex", flexDirection: "column", gap: 2 }}>
              {[
                { name: "Priya Shah", email: "priya.shah@gmail.com", meta: "(512) 555-0134 · Owner", primary: true },
                { name: "Morgan Shah", email: "morgan.shah@outlook.com", meta: "(512) 555-0161 · Spouse" },
              ].map((p) => (
                <Stack key={p.name} direction="row" gap={1.5}>
                  <InitialsAvatar name={p.name} size={32} />
                  <Stack minWidth={0}>
                    <Stack direction="row" gap={1} alignItems="center">
                      <Box sx={{ fontWeight: 500 }}>{p.name}</Box>
                      {p.primary && <StatusTag tone="brand" dot={false}>Primary</StatusTag>}
                    </Stack>
                    <a href={`mailto:${p.email}`} style={{ fontSize: 13.5 }}>
                      {p.email}
                    </a>
                    <Muted sx={{ fontSize: 13 }}>{p.meta}</Muted>
                  </Stack>
                </Stack>
              ))}
            </SectionCard>
            <SectionCard title="Billing address" bodySx={{ p: 2.5 }}>
              1418 Larkspur Ln
              <br />
              Austin, TX 78704
            </SectionCard>
            <SectionCard title="Recent activity" bodySx={{ px: 2.5, py: 1 }}>
              {[
                ["Paid $15,000 on INV-3108", "Oct 27"],
                ["Viewed project portal", "Oct 27"],
                ["CO-004 sent for approval", "Oct 27"],
              ].map(([t, d], i) => (
                <Stack key={t} direction="row" justifyContent="space-between" sx={{ py: 1.25, fontSize: 13.5, borderBottom: i < 2 ? `1px solid ${tokens.rowDivider}` : 0 }}>
                  <span>{t}</span>
                  <Muted>{d}</Muted>
                </Stack>
              ))}
            </SectionCard>
          </>
        }
      />
    </>
  );
}
