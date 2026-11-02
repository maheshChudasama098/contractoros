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
import Link from "next/link";
import { useMemo, useState } from "react";
import { KpiStrip, Muted, Num, PageHeader, SearchField, StatusTag, TabBar } from "@web/components/ui";
import type { Tone } from "@web/theme/tokens";

type Row = { no: string; sent: string; customer: string; est: string; proposal: [string, Tone]; contract?: [string, Tone, string]; project?: string; value: string; seg: "sign" | "signed" | "closed"; href?: string };

const ROWS: Row[] = [
  { no: "PR-0412", sent: "Sent Oct 21", customer: "Sofia Marquez", est: "EST-2079 v2", proposal: ["Accepted", "success"], contract: ["Awaiting signature", "warning", "CT-0188"], value: "$93,140.00", seg: "sign", href: "/proposals/ct-0188" },
  { no: "PR-0409", sent: "Sent Oct 6", customer: "Ellen Whitaker", est: "EST-2076 v1", proposal: ["Accepted", "success"], contract: ["Signed Oct 12", "success", "CT-0185"], project: "P-1045", value: "$64,200.00", seg: "signed" },
  { no: "PR-0405", sent: "Sent Sep 19", customer: "Carmen Castillo", est: "EST-2072 v2", proposal: ["Accepted", "success"], contract: ["Signed Sep 28", "success", "CT-0183"], project: "P-1047", value: "$47,800.00", seg: "signed" },
  { no: "PR-0401", sent: "Sent Sep 25", customer: "Paul Novak", est: "EST-2070 v1", proposal: ["Declined Oct 2", "danger"], value: "$19,000.00", seg: "closed" },
  { no: "PR-0398", sent: "Sent Sep 18", customer: "Ben Foster", est: "EST-2068 v1", proposal: ["Expired Oct 18", "warning"], value: "$12,410.00", seg: "closed" },
  { no: "PR-0390", sent: "Sent Aug 30", customer: "Priya & Morgan Shah", est: "EST-2052 v3", proposal: ["Accepted", "success"], contract: ["Signed Sep 4", "success", "CT-0161"], project: "P-1042", value: "$86,400.00", seg: "signed" },
];

export function ProposalsView() {
  const [seg, setSeg] = useState<"all" | Row["seg"]>("all");
  const [q, setQ] = useState("");
  const rows = useMemo(() => ROWS.filter((r) => (seg === "all" || r.seg === seg) && `${r.no} ${r.customer}`.toLowerCase().includes(q.trim().toLowerCase())), [seg, q]);

  return (
    <>
      <PageHeader
        title="Proposals & contracts"
        subtitle="Each proposal sends one exact estimate version. Signed contracts create the project once."
        actions={
          <Button component={Link} href="/estimates" variant="contained" color="primary">
            New proposal from estimate
          </Button>
        }
      />
      <KpiStrip
        items={[
          { label: "Awaiting signature", value: "$93,140", hint: "1 contract · viewed 3×" },
          { label: "Sent, not yet decided", value: "$0", hint: "No open proposals" },
          { label: "Signed in October", value: "$64,200", hint: "1 contract" },
          { label: "Acceptance rate · 90 days", value: "67%", hint: "4 of 6 accepted" },
        ]}
      />
      <Stack direction="row" flexWrap="wrap" justifyContent="space-between" alignItems="flex-end" gap={2}>
        <TabBar
          label="Status"
          value={seg}
          onChange={setSeg}
          items={[
            { value: "all", label: "All", count: 6 },
            { value: "sign", label: "Needs signature", count: 1 },
            { value: "signed", label: "Signed", count: 3 },
            { value: "closed", label: "Declined & expired", count: 2 },
          ]}
        />
        <SearchField label="Filter proposals" placeholder="Number or customer" value={q} onChange={setQ} />
      </Stack>
      <Card component="section" aria-label="Proposals">
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Proposal</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Estimate</TableCell>
                <TableCell>Proposal</TableCell>
                <TableCell>Contract</TableCell>
                <TableCell>Project</TableCell>
                <TableCell align="right">Value</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.no} hover>
                  <TableCell>
                    <Link href={r.href ?? "/proposals/ct-0188"}>
                      <Num sx={{ fontWeight: 500 }}>{r.no}</Num>
                    </Link>
                    <Muted sx={{ display: "block", fontSize: 12 }}>{r.sent}</Muted>
                  </TableCell>
                  <TableCell>{r.customer}</TableCell>
                  <TableCell>
                    <Num sx={{ color: "text.secondary" }}>{r.est}</Num>
                  </TableCell>
                  <TableCell>
                    <StatusTag tone={r.proposal[1]}>{r.proposal[0]}</StatusTag>
                  </TableCell>
                  <TableCell>
                    {r.contract ? (
                      <Stack gap={0.25} alignItems="flex-start">
                        <StatusTag tone={r.contract[1]}>{r.contract[0]}</StatusTag>
                        <Num sx={{ fontSize: 12, color: "text.secondary" }}>{r.contract[2]}</Num>
                      </Stack>
                    ) : (
                      <Muted>—</Muted>
                    )}
                  </TableCell>
                  <TableCell>
                    {r.project ? (
                      <Link href={`/projects/${r.project.toLowerCase()}`}>
                        <Num>{r.project}</Num>
                      </Link>
                    ) : r.seg === "sign" ? (
                      <Muted>After signing</Muted>
                    ) : (
                      <Muted>—</Muted>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ color: r.seg === "closed" ? "text.secondary" : undefined }}>
                      <Num>{r.value}</Num>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </>
  );
}
