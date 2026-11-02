"use client";

import CheckCircleOutline from "@mui/icons-material/CheckCircleOutline";
import ErrorOutline from "@mui/icons-material/ErrorOutline";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { Muted, Num, PageHeader, StatusTag } from "@web/components/ui";
import { tokens } from "@web/theme/tokens";

const SECTIONS: [string, [string, string, string, string][]][] = [
  ["Demolition & framing", [["Demolition & haul-off", "1 ls", "$2,400.00", "$2,400.00"], ["Framing lumber & fasteners *", "620 lf", "$3.10", "$1,922.00"], ["Wall framing", "48 hr", "$85.00", "$4,080.00"]]],
  ["Electrical", [["Electrical rough-in — licensed subcontractor, 14 circuits, permit", "1 ls", "$6,850.00", "$6,850.00"]]],
  ["Drywall", [["1/2 in drywall board *", "92 sheet", "$18.50", "$1,702.00"], ["Hang, tape & finish — Level 4", "2,350 sf", "$2.40", "$5,640.00"]]],
  ["Flooring", [["LVP flooring material — allowance *", "1 ea", "$4,500.00", "$4,500.00"], ["Flooring install", "980 sf", "$3.25", "$3,185.00"]]],
];

const CHECKS: [boolean, string][] = [
  [true, "Internal cost and margin excluded from this document"],
  [true, "Tax jurisdiction set: Round Rock, TX"],
  [true, "Customer email on file"],
  [false, "Margin 26.6% is below the 28% company target"],
];

const cap = { fontSize: 11, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase" as const, color: "text.secondary" };

export function EstimatePreviewView({ id }: { id: string }) {
  return (
    <>
      <PageHeader
        title="Estimate preview"
        subtitle={
          <>
            <Num>EST-2081</Num> · Version 1 · Draft
          </>
        }
        actions={
          <>
            <Button component={Link} href={`/estimates/${id}`}>
              Back to editor
            </Button>
            <Button>Download PDF</Button>
            <Button variant="contained" color="primary" component={Link} href="/proposals/ct-0188">
              Issue & send proposal
            </Button>
          </>
        }
      />
      <Box sx={{ display: "grid", gap: 3, alignItems: "start", gridTemplateColumns: { xs: "1fr", lg: "minmax(0,1fr) 320px" } }}>
        <Card component="article" aria-label="Estimate document" sx={{ position: "relative", p: { xs: 3, md: 6 }, maxWidth: 860, mx: "auto", width: "100%", display: "flex", flexDirection: "column", gap: 4, boxShadow: "0 8px 24px rgba(16,24,40,.08)" }}>
          <Box sx={{ position: "absolute", top: 24, right: 24 }}>
            <StatusTag tone="warning" dot={false}>
              DRAFT
            </StatusTag>
          </Box>
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={3}>
            <Stack direction="row" gap={1.5}>
              <Box sx={{ width: 44, height: 44, borderRadius: "10px", bgcolor: "#3A2A22", color: "#F5C9B1", display: "grid", placeItems: "center", fontWeight: 600 }}>HP</Box>
              <Stack sx={{ fontSize: 13 }}>
                <Box sx={{ fontWeight: 600, fontSize: 15 }}>Harbor &amp; Pine Remodeling</Box>
                <Muted>2210 E Cesar Chavez St, Suite 4 · Austin, TX 78702</Muted>
                <Muted>(512) 555-0190 · office@harborpine.com</Muted>
              </Stack>
            </Stack>
            <Stack sx={{ textAlign: { sm: "right" }, fontSize: 13 }}>
              <Typography sx={{ fontSize: 22, fontWeight: 600 }}>Estimate</Typography>
              <Num>EST-2081 · Version 1</Num>
              <Muted>Date: October 29, 2026 · Valid 30 days</Muted>
            </Stack>
          </Stack>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 3, fontSize: 13.5 }}>
            <Stack>
              <Box sx={cap}>Prepared for</Box>
              <Box sx={{ fontWeight: 500 }}>Ruth Adeyemi</Box>
              <span>ruth.adeyemi@yahoo.com · (512) 555-0109</span>
            </Stack>
            <Stack>
              <Box sx={cap}>Job site</Box>
              <Box sx={{ fontWeight: 500 }}>811 Oak Hollow Dr</Box>
              <span>Round Rock, TX 78681</span>
            </Stack>
          </Box>
          <Stack gap={0.75}>
            <Box sx={cap}>Scope of work</Box>
            <Typography sx={{ fontSize: 13.5 }}>
              Finish approx. 980 sq ft of unfinished basement into a family room and flex space. Includes framing of exterior and partition walls, electrical rough-in by licensed subcontractor, drywall to Level 4 finish, and luxury vinyl plank flooring. Excludes plumbing, HVAC changes and paint.
            </Typography>
          </Stack>
          <Box component="table" sx={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, "& th": { textAlign: "left", fontSize: 12, fontWeight: 500, color: "text.secondary", borderBottom: `1.5px solid ${tokens.ink}`, py: 1 }, "& td": { py: 1, borderBottom: `1px solid ${tokens.rowDivider}` }, "& .r": { textAlign: "right" } }}>
            <thead>
              <tr>
                <th>Description</th>
                <th className="r">Qty</th>
                <th className="r">Unit price</th>
                <th className="r">Amount</th>
              </tr>
            </thead>
            <tbody>
              {SECTIONS.map(([name, rows]) => [
                <tr key={name}>
                  <Box component="td" colSpan={4} sx={{ fontWeight: 600, pt: "16px !important" }}>
                    {name}
                  </Box>
                </tr>,
                ...rows.map((r) => (
                  <tr key={r[0]}>
                    <td>{r[0]}</td>
                    <td className="r num">{r[1]}</td>
                    <td className="r num">{r[2]}</td>
                    <td className="r num">{r[3]}</td>
                  </tr>
                )),
              ])}
            </tbody>
          </Box>
          <Stack gap={1} sx={{ ml: "auto", width: { xs: "100%", sm: 320 }, fontSize: 13.5 }}>
            <Stack direction="row" justifyContent="space-between">
              <Muted>Subtotal</Muted>
              <Num>$30,279.00</Num>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Muted>Sales tax (8.25% on taxable *)</Muted>
              <Num>$670.23</Num>
            </Stack>
            <Stack direction="row" justifyContent="space-between" sx={{ borderTop: `1.5px solid ${tokens.ink}`, pt: 1, fontWeight: 600, fontSize: 16 }}>
              <span>Total</span>
              <Num>$30,949.23</Num>
            </Stack>
          </Stack>
          <Stack gap={0.75}>
            <Box sx={cap}>Terms</Box>
            <Typography sx={{ fontSize: 13 }}>
              Allowance items are billed at actual cost; differences are handled by written change order. Payment schedule: 30% deposit, 40% at drywall complete, 30% at completion. Estimate valid for 30 days from the date above.
            </Typography>
          </Stack>
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, pt: 4 }}>
            {["Customer signature & date", "Harbor & Pine Remodeling"].map((s) => (
              <Box key={s} sx={{ borderTop: `1px solid ${tokens.ink}`, pt: 1, fontSize: 12, color: "text.secondary" }}>
                {s}
              </Box>
            ))}
          </Box>
        </Card>
        <Stack gap={3}>
          <Card sx={{ p: 2.5, display: "flex", flexDirection: "column", gap: 1.5 }}>
            <Typography variant="h3">Before you issue</Typography>
            {CHECKS.map(([ok, t]) => (
              <Stack key={t} direction="row" gap={1} sx={{ fontSize: 13.5 }}>
                {ok ? <CheckCircleOutline sx={{ fontSize: 18, color: "#166534" }} /> : <ErrorOutline sx={{ fontSize: 18, color: "#8A4B08" }} />}
                <span>{t}</span>
              </Stack>
            ))}
          </Card>
          <Card sx={{ p: 2.5, display: "flex", flexDirection: "column", gap: 1 }}>
            <Typography variant="h3">What issuing does</Typography>
            <Muted sx={{ fontSize: 13.5 }}>Locks v1 and its line items as a permanent snapshot, renders the final PDF and lets you send it as a proposal for e-signature.</Muted>
          </Card>
        </Stack>
      </Box>
    </>
  );
}
