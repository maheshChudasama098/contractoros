"use client";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { INVOICE_STATUS_LABELS, INVOICE_TYPE_LABELS, type InvoiceDetail, type Party } from "@shared/contracts/invoices";
import { tokens } from "@web/theme/tokens";
import { fmtDate, usd } from "./api";

/** The customer-facing invoice document. Used on the detail page and the print/PDF page. */
export function InvoicePaper({ inv }: { inv: InvoiceDetail }) {
  const stamp = inv.status === "paid" || inv.status === "void" ? INVOICE_STATUS_LABELS[inv.status] : null;
  return (
    <Box
      className="invoice-paper"
      sx={{
        position: "relative",
        bgcolor: "#fff",
        border: `1px solid ${tokens.border}`,
        borderRadius: "12px",
        p: { xs: 2.5, sm: 4.5 },
        color: tokens.ink,
        fontSize: 14,
        overflow: "hidden",
        "@media print": { border: "none", borderRadius: 0, p: 0 },
      }}
    >
      {stamp && (
        <Box
          aria-hidden
          sx={{
            position: "absolute",
            top: 36,
            right: -46,
            transform: "rotate(35deg)",
            px: 7,
            py: 0.5,
            fontWeight: 700,
            fontSize: 13,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "#fff",
            bgcolor: inv.status === "paid" ? "#15803D" : "#6B7280",
          }}
        >
          {stamp}
        </Box>
      )}

      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={3}>
        <Stack direction="row" gap={2} alignItems="flex-start">
          {inv.from.has_logo && (
            // eslint-disable-next-line @next/next/no-img-element -- auth-protected API image
            <img src="/api/v1/onboarding/logo" alt="" style={{ width: 64, height: 64, objectFit: "contain", borderRadius: 8 }} />
          )}
          <PartyBlock party={inv.from} strong />
        </Stack>
        <Stack sx={{ textAlign: { sm: "right" } }} gap={0.25}>
          <Typography sx={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.01em" }}>Invoice</Typography>
          <Box sx={{ fontWeight: 600 }}>{inv.invoice_number}</Box>
          {inv.invoice_type !== "standard" && <Box sx={{ color: "text.secondary" }}>{INVOICE_TYPE_LABELS[inv.invoice_type]} invoice</Box>}
        </Stack>
      </Stack>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr auto" }, gap: 3, mt: 4 }}>
        <Stack gap={0.5}>
          <Label>Bill to</Label>
          <PartyBlock party={inv.bill_to} strong />
          {inv.project && (
            <Box sx={{ mt: 1, color: "text.secondary" }}>
              Project: {inv.project.project_number} · {inv.project.name}
            </Box>
          )}
        </Stack>
        <Box sx={{ display: "grid", gridTemplateColumns: "auto auto", columnGap: 3, rowGap: 0.75, alignContent: "start" }}>
          <Label>Invoice date</Label>
          <Box sx={{ textAlign: "right" }}>{fmtDate(inv.issue_date)}</Box>
          <Label>Due date</Label>
          <Box sx={{ textAlign: "right", fontWeight: 600 }}>{fmtDate(inv.due_date)}</Box>
          <Label>Amount due</Label>
          <Box sx={{ textAlign: "right", fontWeight: 700 }}>{usd(inv.status === "void" ? 0 : inv.status === "draft" ? inv.total : inv.balance_due)}</Box>
        </Box>
      </Box>

      <Box component="table" sx={{ width: "100%", borderCollapse: "collapse", mt: 4, "& th, & td": { py: 1.25, px: 1, textAlign: "left", verticalAlign: "top" } }}>
        <Box component="thead">
          <Box component="tr" sx={{ borderBottom: `2px solid ${tokens.ink}`, "& th": { fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" } }}>
            <th style={{ paddingLeft: 0 }}>Description</th>
            <th style={{ textAlign: "right" }}>Qty</th>
            <th style={{ textAlign: "right" }}>Rate</th>
            <th style={{ textAlign: "right", paddingRight: 0 }}>Amount</th>
          </Box>
        </Box>
        <Box component="tbody">
          {inv.items.map((it) => (
            <Box component="tr" key={it.id} sx={{ borderBottom: `1px solid ${tokens.divider}` }}>
              <td style={{ paddingLeft: 0 }}>
                {it.description}
                {it.taxable && Number(inv.tax_rate) > 0 && (
                  <Box component="span" sx={{ color: "text.secondary", fontSize: 12, ml: 0.75 }}>
                    T
                  </Box>
                )}
              </td>
              <Box component="td" sx={{ textAlign: "right !important", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
                {it.quantity} {it.unit}
              </Box>
              <Box component="td" sx={{ textAlign: "right !important", fontVariantNumeric: "tabular-nums" }}>
                {usd(it.unit_price)}
              </Box>
              <Box component="td" sx={{ textAlign: "right !important", pr: "0 !important", fontVariantNumeric: "tabular-nums" }}>
                {usd(it.line_subtotal)}
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      <Stack alignItems="flex-end" sx={{ mt: 2 }}>
        <Box sx={{ width: { xs: "100%", sm: 300 }, display: "grid", gridTemplateColumns: "1fr auto", rowGap: 0.75, fontVariantNumeric: "tabular-nums" }}>
          <Row k="Subtotal" v={usd(inv.subtotal)} />
          {Number(inv.discount_total) > 0 && <Row k="Discount" v={`−${usd(inv.discount_total)}`} />}
          {Number(inv.tax_rate) > 0 && <Row k={`Tax (${inv.tax_rate}%)`} v={usd(inv.tax_total)} />}
          <Box sx={{ gridColumn: "1 / -1", borderTop: `1px solid ${tokens.border}`, my: 0.5 }} />
          <Row k="Total" v={usd(inv.total)} strong />
          {Number(inv.amount_paid) > 0 && <Row k="Paid" v={`−${usd(inv.amount_paid)}`} />}
          {inv.status !== "draft" && inv.status !== "void" && <Row k="Balance due" v={usd(inv.balance_due)} strong />}
        </Box>
      </Stack>

      {(inv.customer_notes || inv.terms) && (
        <Stack gap={2} sx={{ mt: 4, pt: 3, borderTop: `1px solid ${tokens.divider}` }}>
          {inv.customer_notes && (
            <Stack gap={0.5}>
              <Label>Notes</Label>
              <Box sx={{ whiteSpace: "pre-wrap" }}>{inv.customer_notes}</Box>
            </Stack>
          )}
          {inv.terms && (
            <Stack gap={0.5}>
              <Label>Terms</Label>
              <Box sx={{ whiteSpace: "pre-wrap", color: "text.secondary" }}>{inv.terms}</Box>
            </Stack>
          )}
        </Stack>
      )}
    </Box>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <Box sx={{ fontSize: 12, fontWeight: 600, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.05em" }}>{children}</Box>;
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <>
      <Box sx={{ color: strong ? tokens.ink : "text.secondary", fontWeight: strong ? 600 : 400 }}>{k}</Box>
      <Box sx={{ textAlign: "right", fontWeight: strong ? 700 : 400 }}>{v}</Box>
    </>
  );
}

function PartyBlock({ party, strong }: { party: Party; strong?: boolean }) {
  return (
    <Stack gap={0.25} sx={{ color: "text.secondary", lineHeight: 1.5 }}>
      <Box sx={{ color: tokens.ink, fontWeight: strong ? 600 : 400, fontSize: 15 }}>{party.name}</Box>
      {party.address_lines.map((l) => (
        <Box key={l}>{l}</Box>
      ))}
      {party.email && <Box>{party.email}</Box>}
      {party.phone && <Box>{party.phone}</Box>}
    </Stack>
  );
}
