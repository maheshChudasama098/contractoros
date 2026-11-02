"use client";

import CheckOutlined from "@mui/icons-material/CheckOutlined";
import DescriptionOutlined from "@mui/icons-material/DescriptionOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useState } from "react";
import { CreateProjectDialog, VoidContractDialog } from "@web/components/dialogs";
import { InitialsAvatar, Muted, Num, SectionCard, SplitLayout, StatusTag } from "@web/components/ui";
import { tokens } from "@web/theme/tokens";

const LIFECYCLE: [string, string, "done" | "now" | "todo"][] = [
  ["Estimate issued", "Oct 21", "done"],
  ["Proposal sent", "Oct 21", "done"],
  ["Accepted", "Oct 26", "done"],
  ["Contract signing", "Viewed 3×", "now"],
  ["Signed", "", "todo"],
  ["Project created", "", "todo"],
];

const SCHEDULE = [
  ["Deposit", "On signing", "30%", "$27,942.00"],
  ["Rough-in complete", "Plumbing & electrical inspections passed", "30%", "$27,942.00"],
  ["Cabinets installed", "Cabinets set, before countertops", "25%", "$23,285.00"],
  ["Final", "Walkthrough & punch list complete", "15%", "$13,971.00"],
];

const EVIDENCE = [
  ["Viewed by Sofia Marquez", "Today 7:42 AM · iPhone · Austin, TX"],
  ["Viewed by Sofia Marquez", "Oct 27, 8:15 PM · Chrome on macOS"],
  ["Viewed by Sofia Marquez", "Oct 26, 6:03 PM"],
  ["Signature request sent", "Oct 26, 4:30 PM · by Dana Ruiz"],
  ["Proposal accepted in portal", "Oct 26, 2:11 PM · verified by email code"],
];

export function ProposalView({ id }: { id: string }) {
  void id;
  const [signed, setSigned] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  return (
    <>
      <Stack direction="row" flexWrap="wrap" justifyContent="space-between" alignItems="flex-start" gap={2}>
        <Stack gap={0.5}>
          <Stack direction="row" gap={1.25} alignItems="center" flexWrap="wrap">
            <Typography variant="h1">Marquez Kitchen Remodel</Typography>
            <StatusTag tone="success">Proposal accepted</StatusTag>
            {signed ? <StatusTag tone="success">Signed</StatusTag> : <StatusTag tone="warning">Awaiting signature</StatusTag>}
          </Stack>
          <Muted>
            Sofia Marquez · 2504 Kinney Ave, Austin, TX 78704 · PR-0412 from{" "}
            <Link href="/estimates/est-2079/preview">
              <Num>EST-2079 v2</Num>
            </Link>
          </Muted>
        </Stack>
        <Stack direction="row" gap={1}>
          <Button onClick={() => setToast("Reminder sent to sofia.marquez@gmail.com")}>Send reminder</Button>
          <Tooltip title={signed ? "" : "Available once CT-0188 is signed"}>
            <span>
              <Button variant="contained" color="primary" disabled={!signed} onClick={() => setCreateOpen(true)}>
                Create project
              </Button>
            </span>
          </Tooltip>
        </Stack>
      </Stack>

      <Card component="section" aria-label="Lifecycle" sx={{ p: 2.5, overflowX: "auto" }}>
        <Stack direction="row" sx={{ minWidth: 720 }}>
          {LIFECYCLE.map(([label, meta, state], i) => {
            const s = signed && i === 3 ? "done" : signed && i === 4 ? "done" : state;
            return (
              <Stack key={label} gap={0.75} sx={{ flex: 1, position: "relative" }}>
                <Stack direction="row" alignItems="center">
                  <Box sx={{ width: 22, height: 22, borderRadius: "50%", display: "grid", placeItems: "center", bgcolor: s === "done" ? tokens.ink : s === "now" ? tokens.brand : "#fff", border: s === "todo" ? "1.5px solid #C9C7BF" : 0, color: "#fff", zIndex: 1 }}>
                    {s === "done" && <CheckOutlined sx={{ fontSize: 14 }} />}
                  </Box>
                  {i < LIFECYCLE.length - 1 && <Box sx={{ flex: 1, height: 2, bgcolor: s === "done" ? tokens.ink : tokens.divider }} />}
                </Stack>
                <Box sx={{ fontWeight: 500, fontSize: 13.5, color: s === "todo" ? "text.secondary" : tokens.ink }}>{label}</Box>
                <Box sx={{ fontSize: 12, color: s === "now" ? tokens.brand : "text.secondary", fontWeight: s === "now" ? 500 : 400 }}>{meta}</Box>
              </Stack>
            );
          })}
        </Stack>
      </Card>

      <SplitLayout
        main={
          <>
            <SectionCard
              title={
                <Stack>
                  <Typography variant="h3">
                    Contract <Num sx={{ color: "text.secondary", fontWeight: 400 }}>CT-0188</Num>
                  </Typography>
                  <Muted sx={{ fontSize: 12.5 }}>Sent via [E-SIGN PROVIDER] · envelope created Oct 26</Muted>
                </Stack>
              }
              action={signed ? <StatusTag tone="success">Signed</StatusTag> : <StatusTag tone="warning">Pending signature</StatusTag>}
            >
              <Stack direction={{ xs: "column", sm: "row" }} gap={2.5} sx={{ p: 2.5 }}>
                <Box sx={{ width: 96, height: 124, flex: "none", borderRadius: "6px", border: `1px solid ${tokens.border}`, bgcolor: tokens.surfaceMuted, display: "grid", placeItems: "center", color: "text.secondary" }}>
                  <DescriptionOutlined />
                </Box>
                <Stack gap={1.5} flex={1}>
                  <Box sx={{ fontWeight: 500 }}>Residential remodeling agreement · 9 pages</Box>
                  {[
                    ["Sofia Marquez", "sofia.marquez@gmail.com · Signer 1", signed ? ["Signed", "success"] : ["Viewed", "info"]],
                    ["Dana Ruiz", "Countersigner · after customer", signed ? ["Signed", "success"] : ["Waiting", "neutral"]],
                  ].map(([n, sub, st]) => (
                    <Stack key={n as string} direction="row" gap={1.25} alignItems="center">
                      <InitialsAvatar name={n as string} size={30} />
                      <Stack flex={1} minWidth={0}>
                        <Box sx={{ fontWeight: 500 }}>{n as string}</Box>
                        <Muted sx={{ fontSize: 12.5 }}>{sub as string}</Muted>
                      </Stack>
                      <StatusTag tone={(st as [string, "success"])[1]}>{(st as string[])[0]}</StatusTag>
                    </Stack>
                  ))}
                </Stack>
              </Stack>
              <Stack direction="row" flexWrap="wrap" justifyContent="space-between" gap={1} sx={{ px: 2.5, py: 1.5, borderTop: `1px solid ${tokens.divider}`, bgcolor: tokens.surfaceMuted }}>
                <Stack direction="row" gap={1}>
                  <Button size="small">View document</Button>
                  <Button size="small" onClick={() => (navigator.clipboard?.writeText("https://sign.example/ct-0188"), setToast("Signing link copied"))}>
                    Copy signing link
                  </Button>
                  {!signed && (
                    <Button size="small" variant="text" onClick={() => setSigned(true)}>
                      Simulate signed
                    </Button>
                  )}
                </Stack>
                <Button size="small" variant="text" sx={{ color: tokens.danger }} onClick={() => setVoidOpen(true)}>
                  Void contract…
                </Button>
              </Stack>
            </SectionCard>

            <SectionCard title="Agreed price & payment schedule" action={<Muted sx={{ fontSize: 12.5 }}>From EST-2079 v2 snapshot</Muted>}>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Milestone</TableCell>
                      <TableCell>Trigger</TableCell>
                      <TableCell align="right">%</TableCell>
                      <TableCell align="right">Amount</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {SCHEDULE.map((r) => (
                      <TableRow key={r[0]}>
                        <TableCell sx={{ fontWeight: 500 }}>{r[0]}</TableCell>
                        <TableCell sx={{ color: "text.secondary" }}>{r[1]}</TableCell>
                        <TableCell align="right">
                          <Num>{r[2]}</Num>
                        </TableCell>
                        <TableCell align="right">
                          <Num>{r[3]}</Num>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow sx={{ "& td": { fontWeight: 600, bgcolor: tokens.surfaceMuted } }}>
                      <TableCell>Contract total</TableCell>
                      <TableCell />
                      <TableCell align="right">
                        <Num>100%</Num>
                      </TableCell>
                      <TableCell align="right">
                        <Num>$93,140.00</Num>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </SectionCard>
          </>
        }
        side={
          <>
            <SectionCard title="Signature evidence" action={<Muted sx={{ fontSize: 12.5 }}>Immutable</Muted>} bodySx={{ px: 2.5, py: 1.5 }}>
              {EVIDENCE.map(([t, m], i) => (
                <Stack key={i} direction="row" gap={1.5} sx={{ py: 1 }}>
                  <Box sx={{ width: 8, height: 8, mt: "7px", borderRadius: "50%", bgcolor: i === 0 ? tokens.brand : "#C9C7BF", flex: "none" }} />
                  <Stack>
                    <Box sx={{ fontWeight: 500, fontSize: 13.5 }}>{t}</Box>
                    <Muted sx={{ fontSize: 12.5 }}>{m}</Muted>
                  </Stack>
                </Stack>
              ))}
            </SectionCard>
            <Card sx={{ p: 2.5, display: "flex", flexDirection: "column", gap: 1 }}>
              <Typography variant="h3">Next: create the project</Typography>
              <Muted sx={{ fontSize: 13.5 }}>Available once CT-0188 is signed. The project links this customer, property, contract and estimate version, and is created only once.</Muted>
            </Card>
          </>
        }
      />

      <VoidContractDialog open={voidOpen} onClose={() => setVoidOpen(false)} onConfirm={() => setToast("Contract CT-0188 voided")} />
      <CreateProjectDialog open={createOpen} onClose={() => setCreateOpen(false)} onConfirm={() => setToast("Project P-1048 created")} />
      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)} message={toast} />
    </>
  );
}
