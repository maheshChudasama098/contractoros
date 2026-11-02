"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Link from "next/link";
import { useState } from "react";
import { Muted, Num, PageHeader, Progress, SectionCard, StatusTag, TabBar } from "@web/components/ui";
import { tokens, type Tone } from "@web/theme/tokens";

const PIPE: [string, number, number][] = [
  ["New", 2, 115000],
  ["Contacted", 2, 40000],
  ["Qualified", 1, 180000],
  ["Estimate", 2, 124000],
];
const MAX = Math.max(...PIPE.map((p) => p[2]));

const PROJ: [string, string, Tone, number | null, string, number | null, string, string][] = [
  ["Shah Kitchen Remodel", "Active", "success", 58, "$89,650.00", 61, "$40,920.00", "$14,170.00"],
  ["Okafor Primary Bath", "Active", "success", 34, "$38,900.00", 30, "$11,670.00", "$0.00"],
  ["Whitaker Basement Finish", "Scheduled", "info", 0, "$64,200.00", 0, "$0.00", "$0.00"],
  ["Delgado Deck & Patio", "On hold", "warning", 45, "$22,750.00", 30, "$0.00", "$6,825.00"],
  ["Castillo Laundry Addition", "Planned", "neutral", null, "$47,800.00", null, "$0.00", "$0.00"],
];

const dim = (v: string) => (v === "$0.00" || v === "—" ? { color: "text.secondary" } : undefined);

export function ReportsView() {
  const [tab, setTab] = useState<"overview" | "pipeline" | "receivables" | "projects">("overview");
  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="As of Oct 29, 2026 · Central Time"
        actions={
          <>
            <Button>Last 90 days</Button>
            <Button>Export CSV</Button>
          </>
        }
      />
      <TabBar
        label="Report"
        value={tab}
        onChange={setTab}
        items={[
          { value: "overview", label: "Overview" },
          { value: "pipeline", label: "Sales pipeline" },
          { value: "receivables", label: "Receivables" },
          { value: "projects", label: "Project status" },
        ]}
      />
      <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, alignItems: "start" }}>
        {(tab === "overview" || tab === "pipeline") && (
          <SectionCard title="Sales pipeline by stage" action={<Num sx={{ color: "text.secondary", fontSize: 13 }}>$459,000 open</Num>}>
            <Stack gap={1.5} sx={{ p: 2.5 }}>
              {PIPE.map(([s, n, v]) => (
                <Box key={s} sx={{ display: "grid", gridTemplateColumns: "120px 1fr 90px", gap: 1.5, alignItems: "center", fontSize: 13.5 }}>
                  <span>
                    {s} <Muted>· {n}</Muted>
                  </span>
                  <Box sx={{ height: 10, borderRadius: "5px", bgcolor: tokens.divider }}>
                    <Box sx={{ width: `${(v / MAX) * 100}%`, height: "100%", borderRadius: "5px", bgcolor: tokens.brand }} />
                  </Box>
                  <Num sx={{ textAlign: "right" }}>{`$${v.toLocaleString()}`}</Num>
                </Box>
              ))}
            </Stack>
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", borderTop: `1px solid ${tokens.divider}` }}>
              {[
                ["Win rate", <Num key="a">60%</Num>, "3 of 5 decided"],
                ["Average won job", <Num key="b">$63,167</Num>, ""],
                ["Top source", "Referral", "2 of 3 wins"],
              ].map(([k, v, s], i) => (
                <Stack key={i} gap={0.25} sx={{ p: 2, borderRight: i < 2 ? `1px solid ${tokens.divider}` : 0 }}>
                  <Muted sx={{ fontSize: 12 }}>{k}</Muted>
                  <Box sx={{ fontSize: 18, fontWeight: 500 }}>{v}</Box>
                  {s && <Muted sx={{ fontSize: 12 }}>{s}</Muted>}
                </Stack>
              ))}
            </Box>
          </SectionCard>
        )}
        {(tab === "overview" || tab === "receivables") && (
          <SectionCard title="Receivables aging" action={<Num sx={{ color: "text.secondary", fontSize: 13 }}>$20,995 outstanding</Num>}>
            <Stack gap={1} sx={{ p: 2.5 }}>
              <Stack direction="row" gap="2px" sx={{ height: 12, borderRadius: "6px", overflow: "hidden" }}>
                <Box sx={{ flex: 67.5, bgcolor: tokens.brand }} />
                <Box sx={{ flex: 32.5, bgcolor: "#7F1D1D" }} />
              </Stack>
              <Stack direction="row" gap={2} sx={{ fontSize: 12.5 }}>
                {[
                  ["Current", tokens.brand],
                  ["1–30 overdue", "#7F1D1D"],
                ].map(([l, c]) => (
                  <Stack key={l} direction="row" gap={0.75} alignItems="center">
                    <Box sx={{ width: 8, height: 8, borderRadius: "2px", bgcolor: c }} />
                    {l}
                  </Stack>
                ))}
              </Stack>
            </Stack>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Customer</TableCell>
                    <TableCell align="right">Current</TableCell>
                    <TableCell align="right">1–30 overdue</TableCell>
                    <TableCell align="right">31–60</TableCell>
                    <TableCell align="right">60+</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {[
                    ["Priya & Morgan Shah", "$14,170.00", "—", "—", "—"],
                    ["Rosa Delgado", "—", "$6,825.00", "—", "—"],
                  ].map((r) => (
                    <TableRow key={r[0]}>
                      <TableCell>{r[0]}</TableCell>
                      {r.slice(1).map((v, i) => (
                        <TableCell key={i} align="right">
                          <Num sx={dim(v)}>{v}</Num>
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                  <TableRow sx={{ "& td": { fontWeight: 600, bgcolor: tokens.surfaceMuted } }}>
                    <TableCell>Total</TableCell>
                    {["$14,170.00", "$6,825.00", "$0.00", "$0.00"].map((v, i) => (
                      <TableCell key={i} align="right">
                        <Num>{v}</Num>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </SectionCard>
        )}
      </Box>
      {(tab === "overview" || tab === "projects") && (
        <SectionCard title="Project status" action={<Link href="/projects">All projects</Link>}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Project</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell sx={{ minWidth: 150 }}>Work complete</TableCell>
                  <TableCell align="right">Contract value</TableCell>
                  <TableCell sx={{ minWidth: 150 }}>Invoiced</TableCell>
                  <TableCell align="right">Collected</TableCell>
                  <TableCell align="right">Balance due</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {PROJ.map(([n, s, t, w, cv, inv, col, bal]) => (
                  <TableRow key={n} hover>
                    <TableCell sx={{ fontWeight: 500 }}>{n}</TableCell>
                    <TableCell><StatusTag tone={t}>{s}</StatusTag></TableCell>
                    <TableCell>{w == null ? <Muted>Not started</Muted> : <Progress value={w} />}</TableCell>
                    <TableCell align="right"><Num>{cv}</Num></TableCell>
                    <TableCell>{inv == null ? <Muted>—</Muted> : <Progress value={inv} color="#1E40AF" />}</TableCell>
                    <TableCell align="right"><Num sx={dim(col)}>{col}</Num></TableCell>
                    <TableCell align="right"><Num sx={dim(bal)}>{bal}</Num></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </SectionCard>
      )}
    </>
  );
}
