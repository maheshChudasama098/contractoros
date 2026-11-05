"use client";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";
import type { Party } from "@shared/contracts/invoices";
import { tokens } from "@web/theme/tokens";
import { usd } from "@web/features/invoices/api";

export type DocItem = {
  name: string;
  description?: string | null;
  quantity: string;
  unit: string;
  unit_price: string;
  line_subtotal: string;
  /** Optional per-line extra (internal cost) shown only to staff. */
  extra?: ReactNode;
};

export type DocTotals = { subtotal: string; discount_total: string; tax_rate: string; tax_total: string; total: string };

/**
 * Customer-facing document layout shared by estimates, proposals and contracts
 * (detail pages, the customer portal and print/PDF).
 */
export function QuoteDocument({
  kind,
  number,
  logoUrl,
  from,
  to,
  meta,
  title,
  intro,
  items,
  totals,
  sections = [],
  stamp,
  footer,
}: {
  kind: string;
  number: string;
  logoUrl?: string | null;
  from: Party;
  to: Party;
  meta: { k: string; v: ReactNode; strong?: boolean }[];
  title?: string | null;
  intro?: string | null;
  items: DocItem[];
  totals: DocTotals;
  sections?: { heading: string; body: string | null | undefined; muted?: boolean }[];
  stamp?: { text: string; color: string } | null;
  footer?: ReactNode;
}) {
  return (
    <Box
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
            bgcolor: stamp.color,
          }}
        >
          {stamp.text}
        </Box>
      )}

      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={3}>
        <Stack direction="row" gap={2} alignItems="flex-start">
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- auth/token-protected API image
            <img src={logoUrl} alt="" style={{ width: 64, height: 64, objectFit: "contain", borderRadius: 8 }} />
          )}
          <PartyBlock party={from} />
        </Stack>
        <Stack sx={{ textAlign: { sm: "right" } }} gap={0.25}>
          <Typography sx={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.01em" }}>{kind}</Typography>
          <Box sx={{ fontWeight: 600 }}>{number}</Box>
        </Stack>
      </Stack>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr auto" }, gap: 3, mt: 4 }}>
        <Stack gap={0.5}>
          <Label>Prepared for</Label>
          <PartyBlock party={to} />
        </Stack>
        <Box sx={{ display: "grid", gridTemplateColumns: "auto auto", columnGap: 3, rowGap: 0.75, alignContent: "start" }}>
          {meta.map((m) => (
            <Box key={m.k} sx={{ display: "contents" }}>
              <Label>{m.k}</Label>
              <Box sx={{ textAlign: "right", fontWeight: m.strong ? 700 : 400 }}>{m.v}</Box>
            </Box>
          ))}
        </Box>
      </Box>

      {(title || intro) && (
        <Stack gap={0.75} sx={{ mt: 4 }}>
          {title && <Typography sx={{ fontSize: 18, fontWeight: 600 }}>{title}</Typography>}
          {intro && <Box sx={{ whiteSpace: "pre-wrap", color: "text.secondary", lineHeight: 1.6 }}>{intro}</Box>}
        </Stack>
      )}

      <Box component="table" sx={{ width: "100%", borderCollapse: "collapse", mt: 3, "& th, & td": { py: 1.25, px: 1, textAlign: "left", verticalAlign: "top" } }}>
        <thead>
          <Box component="tr" sx={{ borderBottom: `2px solid ${tokens.ink}`, "& th": { fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" } }}>
            <th style={{ paddingLeft: 0 }}>Item</th>
            <th style={{ textAlign: "right" }}>Qty</th>
            <th style={{ textAlign: "right" }}>Rate</th>
            <th style={{ textAlign: "right", paddingRight: 0 }}>Amount</th>
          </Box>
        </thead>
        <tbody>
          {items.map((it, i) => (
            <Box component="tr" key={i} sx={{ borderBottom: `1px solid ${tokens.divider}` }}>
              <td style={{ paddingLeft: 0 }}>
                <Box sx={{ fontWeight: 500 }}>{it.name}</Box>
                {it.description && <Box sx={{ color: "text.secondary", fontSize: 13, whiteSpace: "pre-wrap", mt: 0.25 }}>{it.description}</Box>}
                {it.extra}
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
        </tbody>
      </Box>

      <Stack alignItems="flex-end" sx={{ mt: 2 }}>
        <Box sx={{ width: { xs: "100%", sm: 300 }, display: "grid", gridTemplateColumns: "1fr auto", rowGap: 0.75, fontVariantNumeric: "tabular-nums" }}>
          <Row k="Subtotal" v={usd(totals.subtotal)} />
          {Number(totals.discount_total) > 0 && <Row k="Discount" v={`−${usd(totals.discount_total)}`} />}
          {Number(totals.tax_rate) > 0 && <Row k={`Tax (${totals.tax_rate}%)`} v={usd(totals.tax_total)} />}
          <Box sx={{ gridColumn: "1 / -1", borderTop: `1px solid ${tokens.border}`, my: 0.5 }} />
          <Row k="Total" v={usd(totals.total)} strong />
        </Box>
      </Stack>

      {sections.filter((s) => s.body).length > 0 && (
        <Stack gap={2.5} sx={{ mt: 4, pt: 3, borderTop: `1px solid ${tokens.divider}` }}>
          {sections
            .filter((s) => s.body)
            .map((s) => (
              <Stack key={s.heading} gap={0.75}>
                <Label>{s.heading}</Label>
                <Box sx={{ whiteSpace: "pre-wrap", lineHeight: 1.6, color: s.muted ? "text.secondary" : tokens.ink }}>{s.body}</Box>
              </Stack>
            ))}
        </Stack>
      )}
      {footer}
    </Box>
  );
}

export function Label({ children }: { children: ReactNode }) {
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

function PartyBlock({ party }: { party: Party }) {
  return (
    <Stack gap={0.25} sx={{ color: "text.secondary", lineHeight: 1.5 }}>
      <Box sx={{ color: tokens.ink, fontWeight: 600, fontSize: 15 }}>{party.name}</Box>
      {party.address_lines.map((l) => (
        <Box key={l}>{l}</Box>
      ))}
      {party.email && <Box>{party.email}</Box>}
      {party.phone && <Box>{party.phone}</Box>}
    </Stack>
  );
}

/** Signature block for contracts: evidence once signed, blank lines before. */
export function SignatureBlock({
  signed,
  signerName,
  contractorName,
}: {
  signed: { signed_name: string; signed_at: string; signature_type: "typed" | "drawn"; signature_image: string | null } | null;
  signerName: string;
  contractorName: string;
}) {
  const when = signed ? new Date(signed.signed_at).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : null;
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 4, mt: 5, pt: 3, borderTop: `1px solid ${tokens.divider}`, breakInside: "avoid" }}>
      <Stack gap={0.75}>
        <Label>Customer signature</Label>
        <Box sx={{ height: 64, borderBottom: `1px solid ${tokens.ink}`, display: "flex", alignItems: "flex-end", pb: 0.5 }}>
          {signed &&
            (signed.signature_type === "drawn" && signed.signature_image ? (
              // eslint-disable-next-line @next/next/no-img-element -- data URL
              <img src={signed.signature_image} alt={`Signature of ${signed.signed_name}`} style={{ maxHeight: 60, maxWidth: "100%" }} />
            ) : (
              <Box sx={{ fontFamily: "'Brush Script MT', 'Segoe Script', cursive", fontSize: 30, lineHeight: 1 }}>{signed.signed_name}</Box>
            ))}
        </Box>
        <Box sx={{ fontSize: 13 }}>{signed?.signed_name ?? signerName}</Box>
        {when && <Box sx={{ fontSize: 12, color: "text.secondary" }}>Signed electronically · {when}</Box>}
      </Stack>
      <Stack gap={0.75}>
        <Label>Contractor</Label>
        <Box sx={{ height: 64, borderBottom: `1px solid ${tokens.ink}` }} />
        <Box sx={{ fontSize: 13 }}>{contractorName}</Box>
      </Stack>
    </Box>
  );
}
