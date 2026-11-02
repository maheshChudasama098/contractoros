"use client";

import AddOutlined from "@mui/icons-material/AddOutlined";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Link from "next/link";
import { useMemo, useState } from "react";
import { InitialsAvatar, Muted, Num, PageHeader, SearchField, StatusTag, TabBar, Toolbar, TwoLine } from "@web/components/ui";
import { tokens, type Tone } from "@web/theme/tokens";

type Status = "Draft" | "Issued" | "Accepted" | "Declined" | "Expired";
const TONE: Record<Status, Tone> = { Draft: "neutral", Issued: "info", Accepted: "success", Declined: "danger", Expired: "warning" };

const ROWS: { no: string; title: string; customer: string; ver: string; status: Status; total?: string; margin?: string; by: string; updated: string; href: string }[] = [
  { no: "EST-2081", title: "Basement finish", customer: "Ruth Adeyemi", ver: "v1", status: "Draft", total: "$30,949.23", margin: "26.6%", by: "Lena Ortiz", updated: "Today", href: "/estimates/est-2081" },
  { no: "EST-2079", title: "Kitchen remodel", customer: "Sofia Marquez", ver: "v2", status: "Issued", total: "$93,140.00", margin: "31.2%", by: "Lena Ortiz", updated: "Oct 21", href: "/proposals/ct-0188" },
  { no: "EST-2074", title: "Backyard ADU", customer: "Will Chen", ver: "v1", status: "Draft", by: "Dana Ruiz", updated: "Oct 28", href: "/estimates/est-2074" },
  { no: "EST-2076", title: "Basement finish", customer: "Ellen Whitaker", ver: "v1", status: "Accepted", total: "$64,200.00", margin: "28.4%", by: "Lena Ortiz", updated: "Oct 9", href: "/estimates/est-2076/preview" },
  { no: "EST-2070", title: "Deck rebuild", customer: "Paul Novak", ver: "v1", status: "Declined", total: "$19,000.00", margin: "24.0%", by: "Sam Whitfield", updated: "Oct 2", href: "/estimates/est-2070/preview" },
  { no: "EST-2068", title: "Window replacement", customer: "Ben Foster", ver: "v1", status: "Expired", total: "$12,410.00", margin: "22.5%", by: "Sam Whitfield", updated: "Sep 18", href: "/estimates/est-2068/preview" },
  { no: "EST-2052", title: "Kitchen remodel", customer: "Priya & Morgan Shah", ver: "v3", status: "Accepted", total: "$86,400.00", margin: "29.8%", by: "Lena Ortiz", updated: "Sep 2", href: "/estimates/est-2052/preview" },
];

type Seg = "all" | "draft" | "issued" | "accepted" | "closed";
const match: Record<Seg, (s: Status) => boolean> = {
  all: () => true,
  draft: (s) => s === "Draft",
  issued: (s) => s === "Issued",
  accepted: (s) => s === "Accepted",
  closed: (s) => s === "Declined" || s === "Expired",
};

export function EstimatesView() {
  const [seg, setSeg] = useState<Seg>("all");
  const [q, setQ] = useState("");
  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return ROWS.filter((r) => match[seg](r.status) && (!t || `${r.no} ${r.title} ${r.customer}`.toLowerCase().includes(t)));
  }, [seg, q]);

  return (
    <>
      <PageHeader
        title="Estimates"
        subtitle={
          <>
            <Num>$93,140</Num> issued and awaiting decision · 2 drafts in progress
          </>
        }
        actions={
          <>
            <Button>Pricing catalog</Button>
            <Button component={Link} href="/estimates/new" variant="contained" color="primary" startIcon={<AddOutlined />}>
              New estimate
            </Button>
          </>
        }
      />
      <Stack direction="row" flexWrap="wrap" justifyContent="space-between" alignItems="flex-end" gap={2}>
        <TabBar
          label="Status"
          value={seg}
          onChange={setSeg}
          items={[
            { value: "all", label: "All", count: 7 },
            { value: "draft", label: "Draft", count: 2 },
            { value: "issued", label: "Issued", count: 1 },
            { value: "accepted", label: "Accepted", count: 2 },
            { value: "closed", label: "Declined & expired", count: 2 },
          ]}
        />
        <Toolbar>
          <SearchField label="Filter estimates" placeholder="Number, customer, title…" value={q} onChange={setQ} />
          <Button>Estimator</Button>
        </Toolbar>
      </Stack>
      <Card component="section" aria-label="Estimates">
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Estimate</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Version</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Customer total</TableCell>
                <TableCell align="right">Margin</TableCell>
                <TableCell>Estimator</TableCell>
                <TableCell>Updated</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.no} hover>
                  <TableCell>
                    <TwoLine title={r.title} sub={<Num>{r.no}</Num>} href={r.href} />
                  </TableCell>
                  <TableCell>{r.customer}</TableCell>
                  <TableCell>
                    <Num>{r.ver}</Num>
                  </TableCell>
                  <TableCell>
                    <StatusTag tone={TONE[r.status]}>{r.status}</StatusTag>
                  </TableCell>
                  <TableCell align="right">{r.total ? <Num>{r.total}</Num> : <Muted>—</Muted>}</TableCell>
                  <TableCell align="right">{r.margin ? <Num>{r.margin}</Num> : <Muted>—</Muted>}</TableCell>
                  <TableCell>
                    <span title={r.by}>
                      <InitialsAvatar name={r.by} />
                    </span>
                  </TableCell>
                  <TableCell sx={{ color: "text.secondary" }}>{r.updated}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <Stack direction="row" flexWrap="wrap" justifyContent="space-between" gap={1} sx={{ px: 2.5, py: 1.5, borderTop: `1px solid ${tokens.divider}`, fontSize: 13, color: "text.secondary" }}>
          <span>
            Showing {rows.length} of {ROWS.length}
          </span>
          <span>Margin is visible to you as Owner. Hidden for roles without cost access.</span>
        </Stack>
      </Card>
    </>
  );
}
