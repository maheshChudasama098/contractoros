"use client";

import AddOutlined from "@mui/icons-material/AddOutlined";
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
import Link from "next/link";
import { useMemo, useState } from "react";
import { KpiStrip, Muted, Num, PageHeader, SearchField, StatusTag, TabBar, TwoLine } from "@web/components/ui";
import type { Tone } from "@web/theme/tokens";

type Status = "Draft" | "Partially paid" | "Overdue" | "Paid" | "Void";
const TONE: Record<Status, Tone> = { Draft: "neutral", "Partially paid": "brand", Overdue: "danger", Paid: "success", Void: "neutral" };
const QB_TONE: Record<string, Tone> = { Failed: "danger", Synced: "success" };

const ROWS: { no: string; customer: string; project: string; type: string; status: Status; issued: string; due: string; total: string; paid: string; balance: string; qb: string }[] = [
  { no: "INV-3110", customer: "Ellen Whitaker", project: "Whitaker Basement Finish", type: "Deposit", status: "Draft", issued: "—", due: "—", total: "$19,260.00", paid: "$0.00", balance: "$19,260.00", qb: "Not sent" },
  { no: "INV-3108", customer: "Priya & Morgan Shah", project: "Shah Kitchen Remodel", type: "Progress", status: "Partially paid", issued: "Oct 23", due: "Nov 6", total: "$29,170.00", paid: "$15,000.00", balance: "$14,170.00", qb: "Failed" },
  { no: "INV-3099", customer: "Rosa Delgado", project: "Delgado Deck & Patio", type: "Progress", status: "Overdue", issued: "Oct 3", due: "Oct 17", total: "$6,825.00", paid: "$0.00", balance: "$6,825.00", qb: "Synced" },
  { no: "INV-3101", customer: "Daniel Okafor", project: "Okafor Primary Bath", type: "Deposit", status: "Paid", issued: "Sep 28", due: "Oct 5", total: "$11,670.00", paid: "$11,670.00", balance: "$0.00", qb: "Synced" },
  { no: "INV-3095", customer: "Kevin Brennan", project: "Brennan Whole-Home Paint", type: "Final", status: "Paid", issued: "Oct 9", due: "Oct 16", total: "$4,290.00", paid: "$4,290.00", balance: "$0.00", qb: "Synced" },
  { no: "INV-3104", customer: "Priya & Morgan Shah", project: "Shah Kitchen Remodel", type: "Deposit", status: "Paid", issued: "Sep 4", due: "Sep 11", total: "$25,920.00", paid: "$25,920.00", balance: "$0.00", qb: "Synced" },
];

type Seg = "all" | "draft" | "open" | "overdue" | "paid" | "void";
const SEG: Record<Seg, (s: Status) => boolean> = { all: () => true, draft: (s) => s === "Draft", open: (s) => s === "Partially paid", overdue: (s) => s === "Overdue", paid: (s) => s === "Paid", void: (s) => s === "Void" };

export function InvoicesView() {
  const [seg, setSeg] = useState<Seg>("all");
  const [q, setQ] = useState("");
  const rows = useMemo(() => ROWS.filter((r) => SEG[seg](r.status) && `${r.no} ${r.customer} ${r.project}`.toLowerCase().includes(q.trim().toLowerCase())), [seg, q]);
  const zero = (v: string) => (v === "$0.00" ? { color: "text.secondary" } : undefined);

  return (
    <>
      <PageHeader
        title="Invoices & payments"
        subtitle="Payments are confirmed by Stripe before balances update."
        actions={
          <>
            <Button>Export</Button>
            <Button component={Link} href="/invoices/new" variant="contained" color="primary" startIcon={<AddOutlined />}>
              New invoice
            </Button>
          </>
        }
      />
      <KpiStrip
        items={[
          { label: "Outstanding", value: "$20,995.00", hint: "2 invoices" },
          { label: "Overdue", value: "$6,825.00", hint: "1 invoice · 12 days", hintTone: "danger" },
          { label: "Drafts", value: "$19,260.00", hint: "1 ready to issue" },
          { label: "Collected · October", value: "$30,960.00", hint: "3 successful payments" },
        ]}
      />
      <Stack direction="row" flexWrap="wrap" justifyContent="space-between" alignItems="flex-end" gap={2}>
        <TabBar
          label="Status"
          value={seg}
          onChange={setSeg}
          items={[
            { value: "all", label: "All", count: 6 },
            { value: "draft", label: "Draft", count: 1 },
            { value: "open", label: "Open", count: 1 },
            { value: "overdue", label: "Overdue", count: 1 },
            { value: "paid", label: "Paid", count: 3 },
            { value: "void", label: "Void", count: 0 },
          ]}
        />
        <SearchField label="Filter invoices" placeholder="Invoice, customer, project…" value={q} onChange={setQ} />
      </Stack>
      <Card component="section" aria-label="Invoices">
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Invoice</TableCell>
                <TableCell>Customer · project</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Issued</TableCell>
                <TableCell>Due</TableCell>
                <TableCell align="right">Total</TableCell>
                <TableCell align="right">Paid</TableCell>
                <TableCell align="right">Balance</TableCell>
                <TableCell>QuickBooks</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.no} hover>
                  <TableCell>
                    <Link href={`/invoices/${r.no.toLowerCase()}`}>
                      <Num sx={{ fontWeight: 500 }}>{r.no}</Num>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <TwoLine title={<Box component="span" sx={{ fontWeight: 400 }}>{r.customer}</Box>} sub={r.project} />
                  </TableCell>
                  <TableCell>{r.type}</TableCell>
                  <TableCell>
                    <StatusTag tone={TONE[r.status]}>{r.status}</StatusTag>
                  </TableCell>
                  <TableCell sx={{ color: r.issued === "—" ? "text.secondary" : undefined }}>{r.issued}</TableCell>
                  <TableCell sx={{ color: r.status === "Overdue" ? "error.main" : r.due === "—" ? "text.secondary" : undefined, fontWeight: r.status === "Overdue" ? 500 : 400 }}>{r.due}</TableCell>
                  <TableCell align="right"><Num>{r.total}</Num></TableCell>
                  <TableCell align="right"><Num sx={zero(r.paid)}>{r.paid}</Num></TableCell>
                  <TableCell align="right"><Num sx={zero(r.balance)}>{r.balance}</Num></TableCell>
                  <TableCell>{QB_TONE[r.qb] ? <StatusTag tone={QB_TONE[r.qb]}>{r.qb}</StatusTag> : <Muted>{r.qb}</Muted>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </>
  );
}
