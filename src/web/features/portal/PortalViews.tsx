"use client";

import CheckOutlined from "@mui/icons-material/CheckOutlined";
import ChevronRightOutlined from "@mui/icons-material/ChevronRightOutlined";
import CompareArrowsOutlined from "@mui/icons-material/CompareArrowsOutlined";
import ImageOutlined from "@mui/icons-material/ImageOutlined";
import LinkOffOutlined from "@mui/icons-material/LinkOffOutlined";
import LockOutlined from "@mui/icons-material/LockOutlined";
import MailOutline from "@mui/icons-material/MailOutline";
import ReceiptLongOutlined from "@mui/icons-material/ReceiptLongOutlined";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Form, Formik, useFormikContext } from "formik";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { FormikCheckbox, FormikTextField } from "@web/components/form";
import { IconTile, Muted, Num, StatusTag } from "@web/components/ui";
import { v, Yup } from "@web/lib/validation";
import { tokens } from "@web/theme/tokens";
import { bigBtn, Ln, PCard, PH2, PortalShell } from "./PortalShell";

const Photo = ({ label }: { label: string }) => (
  <Box component="button" type="button" aria-label={`Open photo: ${label}`} sx={{ aspectRatio: "1", border: 0, borderRadius: "10px", bgcolor: "#E9E7E1", color: "text.secondary", fontSize: 12, display: "grid", placeItems: "center", cursor: "pointer", font: "inherit" }}>
    <Stack alignItems="center" gap={0.25}>
      <ImageOutlined fontSize="small" />
      {label}
    </Stack>
  </Box>
);

const Details = ({ summary, children }: { summary: string; children: React.ReactNode }) => (
  <Accordion disableGutters elevation={0} sx={{ border: `1px solid ${tokens.border}`, borderRadius: "16px !important", "&:before": { display: "none" } }}>
    <AccordionSummary sx={{ px: 2.5, minHeight: 56, fontWeight: 600 }}>{summary}</AccordionSummary>
    <AccordionDetails sx={{ px: 2.5, pt: 0 }}>{children}</AccordionDetails>
  </Accordion>
);

const MILESTONES: [string, string, "done" | "now" | "todo"][] = [
  ["Demolition", "Sep 18", "done"],
  ["Inspections passed", "Oct 9", "done"],
  ["Cabinets installed", "Nov 4", "now"],
  ["Countertops", "Nov 20", "todo"],
  ["Backsplash, lighting & fixtures", "Dec 4", "todo"],
  ["Final walkthrough", "Dec 18", "todo"],
];

export function PortalOverview({ token }: { token: string }) {
  const base = `/portal/${token}`;
  return (
    <PortalShell token={token} subtitle="Project updates for Priya">
      <PCard>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
          <Stack>
            <Typography sx={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.03em" }}>Kitchen remodel</Typography>
            <Muted>1418 Larkspur Ln, Austin</Muted>
          </Stack>
          <StatusTag tone="brand">In progress</StatusTag>
        </Stack>
        <Stack gap={0.75}>
          <Stack direction="row" justifyContent="space-between">
            <Box sx={{ fontWeight: 500 }}>58% complete</Box>
            <Muted>Est. finish Dec 18</Muted>
          </Stack>
          <LinearProgress variant="determinate" value={58} sx={{ height: 8, borderRadius: 4 }} />
        </Stack>
        <Box sx={{ p: 1.75, borderRadius: "12px", bgcolor: tokens.brandSoft, color: "#6B2A0C" }}>
          <strong>Next: cabinets arrive Wed, Nov 4.</strong> Please keep the driveway clear 7–9 AM.
        </Box>
      </PCard>

      <Stack gap={1}>
        <PH2>Needs your attention</PH2>
        {[
          { href: `${base}/change-order`, icon: <CompareArrowsOutlined />, tone: "warning" as const, title: "Review a change", sub: <>Relocate range gas line · <Num>+$1,840</Num></> },
          { href: `${base}/payments`, icon: <ReceiptLongOutlined />, tone: "brand" as const, title: "Payment due Nov 6", sub: <>Invoice 3108 · <Num>$14,170.00</Num> remaining</> },
        ].map((a) => (
          <Box key={a.title} component={Link} href={a.href} sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 2, minHeight: 64, borderRadius: "14px", bgcolor: "#fff", border: `1px solid ${tokens.border}`, color: tokens.ink, "&:hover": { borderColor: "#C9C7BF", color: tokens.ink } }}>
            <IconTile tone={a.tone} size={40}>
              {a.icon}
            </IconTile>
            <Stack flex={1}>
              <Box sx={{ fontWeight: 600 }}>{a.title}</Box>
              <Muted sx={{ fontSize: 14 }}>{a.sub}</Muted>
            </Stack>
            <ChevronRightOutlined sx={{ color: "text.secondary" }} />
          </Box>
        ))}
      </Stack>

      <PCard>
        <PH2>Latest updates</PH2>
        <Stack component="article" gap={1}>
          <Muted sx={{ fontSize: 13 }}>Yesterday · Marcus Bell</Muted>
          <Typography>Drywall is patched and primed after the rough-in. Cabinet delivery is confirmed for Wednesday morning.</Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 1 }}>
            <Photo label="Primed walls" />
            <Photo label="Ceiling lights" />
            <Photo label="Cabinet layout" />
          </Box>
        </Stack>
        <Stack component="article" gap={1} sx={{ pt: 1.75, borderTop: `1px solid ${tokens.divider}` }}>
          <Muted sx={{ fontSize: 13 }}>Oct 9 · Marcus Bell</Muted>
          <Typography>Plumbing and electrical rough-in inspections passed. On to drywall!</Typography>
        </Stack>
      </PCard>

      <PCard>
        <PH2>Milestones</PH2>
        <Stack>
          {MILESTONES.map(([t, d, s]) => (
            <Stack key={t} direction="row" gap={1.5} alignItems="center" sx={{ py: 1 }}>
              <Box sx={{ width: 22, height: 22, borderRadius: "50%", flex: "none", display: "grid", placeItems: "center", color: "#fff", bgcolor: s === "done" ? "#166534" : s === "now" ? tokens.brand : "#fff", border: s === "todo" ? "1.5px solid #C9C7BF" : 0 }}>{s === "done" && <CheckOutlined sx={{ fontSize: 14 }} />}</Box>
              <Box sx={{ flex: 1, fontWeight: s === "now" ? 600 : 400, color: s === "todo" ? tokens.ink2 : tokens.ink }}>{t}</Box>
              <Box sx={{ fontSize: 14, color: s === "now" ? tokens.brand : "text.secondary", fontWeight: s === "now" ? 500 : 400 }}>{d}</Box>
            </Stack>
          ))}
        </Stack>
      </PCard>

      <PCard id="team">
        <PH2>Your project manager</PH2>
        <Stack direction="row" gap={1.5} alignItems="center">
          <Box sx={{ width: 48, height: 48, borderRadius: "50%", bgcolor: "#EAF0FD", color: "#1E40AF", display: "grid", placeItems: "center", fontWeight: 600 }}>MB</Box>
          <Stack>
            <Box sx={{ fontWeight: 600 }}>Marcus Bell</Box>
            <Muted sx={{ fontSize: 14 }}>Usually replies within a few hours</Muted>
          </Stack>
        </Stack>
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
          <Button href="tel:+15125550190" sx={bigBtn}>
            Call
          </Button>
          <Button href="mailto:marcus@harborpine.com" sx={bigBtn}>
            Email
          </Button>
        </Box>
      </PCard>
      <Muted sx={{ fontSize: 12.5, textAlign: "center" }}>This private link shows only your project. Don&apos;t forward it.</Muted>
    </PortalShell>
  );
}

const DOCS: [string, string, React.ReactNode, boolean?][] = [
  ["PDF", "Signed contract", "Signed Sep 4 · 9 pages", true],
  ["PDF", "Estimate · version 3", "Accepted Sep 2"],
  ["CO", "Change order · Quartz backsplash", <>Approved Sep 26 · <Num>+$2,140.00</Num></>],
  ["CO", "Change order · Under-cabinet lighting", <>Approved Oct 14 · <Num>+$1,110.00</Num></>],
  ["INV", "Invoice 3108 · Progress", <>Oct 23 · <Num>$29,170.00</Num></>],
  ["INV", "Invoice 3104 · Deposit", "Sep 4 · Paid"],
];

export function PortalDocs({ token }: { token: string }) {
  return (
    <PortalShell token={token} subtitle="Kitchen remodel">
      <PCard>
        <Stack direction="row" justifyContent="space-between" alignItems="baseline">
          <Typography sx={{ fontSize: 20, fontWeight: 600 }}>Progress photos</Typography>
          <Muted>9 shared</Muted>
        </Stack>
        {[
          ["October 28", ["Primed walls", "Ceiling lights", "Cabinet layout"]],
          ["October 9", ["Plumbing", "Electrical", "Framing"]],
          ["September 18", ["Demolition", "Before", "Before"]],
        ].map(([d, ps]) => (
          <Stack key={d as string} gap={1}>
            <Muted sx={{ fontSize: 13 }}>{d as string}</Muted>
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 1 }}>
              {(ps as string[]).map((p, i) => (
                <Photo key={i} label={p} />
              ))}
            </Box>
          </Stack>
        ))}
      </PCard>
      <PCard sx={{ gap: 0 }}>
        <Box sx={{ mb: 1 }}>
          <PH2>Documents</PH2>
        </Box>
        {DOCS.map(([ext, t, sub, verify]) => (
          <Box key={t} component="a" href="#" sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 1.5, minHeight: 60, borderTop: `1px solid ${tokens.divider}`, color: tokens.ink }}>
            <Box sx={{ width: 40, height: 40, borderRadius: "8px", bgcolor: "#F0EFEB", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 600, color: "#4A4E57", flex: "none" }}>{ext}</Box>
            <Stack flex={1} minWidth={0}>
              <Box sx={{ fontWeight: 500 }}>{t}</Box>
              <Muted sx={{ fontSize: 13.5 }}>{sub}</Muted>
            </Stack>
            {verify && (
              <Stack direction="row" alignItems="center" gap={0.5} sx={{ fontSize: 13, color: "text.secondary" }}>
                <LockOutlined sx={{ fontSize: 15 }} />
                Verify
              </Stack>
            )}
          </Box>
        ))}
      </PCard>
      <Muted sx={{ fontSize: 13 }}>Download links expire after a few minutes. For signed documents we&apos;ll send a quick code to your email first.</Muted>
    </PortalShell>
  );
}

export function PortalPayments({ token }: { token: string }) {
  const [method, setMethod] = useState<"ach" | "card">("ach");
  return (
    <PortalShell token={token} subtitle="Kitchen remodel">
      <PCard>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Stack gap={0.25}>
            <Muted sx={{ fontSize: 14 }}>Amount due · Invoice 3108</Muted>
            <Num sx={{ fontSize: 32, fontWeight: 500, letterSpacing: "-0.03em" }}>$14,170.00</Num>
            <span>
              Due <strong>Friday, Nov 6</strong>
            </span>
          </Stack>
          <StatusTag tone="brand">Partly paid</StatusTag>
        </Stack>
        <LinearProgress variant="determinate" value={51} sx={{ height: 8, borderRadius: 4 }} />
        <Muted sx={{ fontSize: 14 }}>$15,000.00 of $29,170.00 paid</Muted>
        <Box component="fieldset" sx={{ border: 0, p: 0, m: 0, display: "flex", flexDirection: "column", gap: 1 }}>
          <Box component="legend" sx={{ fontWeight: 600, mb: 1 }}>
            Pay with
          </Box>
          {(
            [
              ["ach", "Bank transfer (ACH)", "Takes 3–5 business days to clear"],
              ["card", "Credit or debit card", "Processed right away"],
            ] as const
          ).map(([val, t, s]) => (
            <Box key={val} component="label" sx={{ display: "flex", gap: 1.5, alignItems: "flex-start", p: 2, minHeight: 64, borderRadius: "12px", cursor: "pointer", border: `1px solid ${method === val ? tokens.brand : tokens.border}`, boxShadow: method === val ? `0 0 0 3px ${tokens.brandRing}` : undefined }}>
              <input type="radio" name="m" checked={method === val} onChange={() => setMethod(val)} style={{ accentColor: tokens.brand, width: 18, height: 18, marginTop: 2 }} />
              <Stack>
                <Box sx={{ fontWeight: 500 }}>{t}</Box>
                <Muted sx={{ fontSize: 14 }}>{s}</Muted>
              </Stack>
            </Box>
          ))}
        </Box>
        <Button variant="contained" color="primary" sx={bigBtn}>
          Pay $14,170.00 securely
        </Button>
        <Muted sx={{ fontSize: 13 }}>You&apos;ll finish on a secure Stripe page. Harbor &amp; Pine never sees your card or bank details.</Muted>
      </PCard>
      <Details summary="What this invoice covers">
        <Ln k="Rough-in complete (30%)" v="$25,920.00" />
        <Ln k="Change · Quartz backsplash" v="$2,140.00" />
        <Ln k="Change · Under-cabinet lighting" v="$1,110.00" />
        <Ln strong k="Invoice total" v="$29,170.00" />
        <Box component={Link} href={`/portal/${token}/docs`} sx={{ display: "inline-block", mt: 1 }}>
          Download invoice PDF
        </Box>
      </Details>
      <PCard sx={{ gap: 0 }}>
        <PH2>Payment history</PH2>
        <Ln k={<Stack><span>Bank transfer received</span><Muted sx={{ fontSize: 13 }}>Oct 27 · Invoice 3108</Muted></Stack>} v="$15,000.00" />
        <Ln k={<Stack><span>Card payment didn&apos;t go through</span><Muted sx={{ fontSize: 13 }}>Oct 25 · your bank declined it — nothing was charged</Muted></Stack>} v={<Muted>—</Muted>} />
        <Ln k={<Stack><span>Deposit paid</span><Muted sx={{ fontSize: 13 }}>Sep 5 · Invoice 3104</Muted></Stack>} v="$25,920.00" />
      </PCard>
      <PCard sx={{ gap: 0 }}>
        <PH2>Coming up</PH2>
        <Ln k={<Stack><span>Cabinets installed</span><Muted sx={{ fontSize: 13 }}>Invoiced after Nov 4 milestone</Muted></Stack>} v="$21,600.00" />
        <Ln k={<Stack><span>Final payment</span><Muted sx={{ fontSize: 13 }}>After final walkthrough</Muted></Stack>} v="$12,960.00" />
      </PCard>
    </PortalShell>
  );
}

export function PortalProposal({ token }: { token: string }) {
  const verify = `/portal/${token}/verify?for=proposal`;
  return (
    <PortalShell token={token} subtitle="(512) 555-0190" tabs={false} contact={false}>
      <Stack gap={0.75}>
        <Box sx={{ fontSize: 14, fontWeight: 500, color: tokens.brand }}>Proposal for Sofia Marquez</Box>
        <Typography sx={{ fontSize: 26, fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1.15 }}>Kitchen remodel at 2504 Kinney Ave</Typography>
        <Muted>Prepared by Lena Ortiz on Oct 21 · Valid until Nov 20, 2026</Muted>
      </Stack>
      <PCard>
        <Stack gap={0.25}>
          <Muted sx={{ fontSize: 14 }}>Total price</Muted>
          <Num sx={{ fontSize: 34, fontWeight: 500, letterSpacing: "-0.03em" }}>$93,140.00</Num>
          <Muted sx={{ fontSize: 14 }}>Includes sales tax on materials · about 12 weeks of work</Muted>
        </Stack>
        <Button component={Link} href={verify} variant="contained" color="primary" sx={bigBtn}>
          Accept &amp; sign
        </Button>
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
          <Button sx={bigBtn}>Download PDF</Button>
          <Button sx={bigBtn}>Ask a question</Button>
        </Box>
      </PCard>
      <PCard sx={{ gap: 1 }}>
        <PH2>What&apos;s included</PH2>
        <Typography>Full kitchen remodel: remove existing cabinets and soffits, move the sink to the new island, new semi-custom cabinets, quartz countertops, tile backsplash, LVP flooring, recessed and pendant lighting, and final paint.</Typography>
        <Box>
          {[
            ["Demolition & prep", "$6,800.00"],
            ["Plumbing & electrical", "$14,250.00"],
            ["Cabinets & installation", "$32,400.00"],
            ["Quartz countertops", "$11,900.00"],
            ["Flooring", "$7,650.00"],
            ["Backsplash & tile", "$4,980.00"],
            ["Lighting & fixtures", "$8,560.00"],
            ["Paint & finish", "$3,200.00"],
          ].map(([k, val]) => (
            <Ln key={k} k={k} v={val} />
          ))}
          <Ln strong k="Subtotal" v="$89,740.00" />
          <Ln muted k="Sales tax on materials" v="$3,400.00" />
          <Ln strong k="Total" v="$93,140.00" />
        </Box>
      </PCard>
      <PCard sx={{ gap: 0 }}>
        <PH2>When you&apos;ll pay</PH2>
        {[
          ["Deposit · 30%", "When you sign", "$27,942.00"],
          ["Rough-in complete · 30%", "After inspections pass", "$27,942.00"],
          ["Cabinets installed · 25%", "Before countertops", "$23,285.00"],
          ["Final · 15%", "After final walkthrough", "$13,971.00"],
        ].map(([t, s, a]) => (
          <Ln key={t} k={<Stack><span>{t}</span><Muted sx={{ fontSize: 13 }}>{s}</Muted></Stack>} v={a} />
        ))}
      </PCard>
      <Details summary="Terms & conditions">
        <Muted>Allowance items are billed at actual cost. Any change to scope or price is made by a written change order that you approve. Work is warrantied for one year from completion.</Muted>
      </Details>
      <Stack gap={1}>
        <Button component={Link} href={verify} variant="contained" color="primary" sx={bigBtn}>
          Accept &amp; sign
        </Button>
        <Button sx={bigBtn}>Decline proposal</Button>
        <Muted sx={{ fontSize: 13, textAlign: "center" }}>To accept, we&apos;ll email you a 6-digit code to confirm it&apos;s you, then you&apos;ll sign the contract.</Muted>
      </Stack>
    </PortalShell>
  );
}

export function PortalChangeOrder({ token }: { token: string }) {
  const router = useRouter();
  return (
    <PortalShell token={token} subtitle="Kitchen remodel" back tabs={false}>
      <Stack gap={0.75}>
        <Box sx={{ fontSize: 14, fontWeight: 500, color: "#8A4B08" }}>Waiting for your approval</Box>
        <Typography sx={{ fontSize: 26, fontWeight: 600, letterSpacing: "-0.03em" }}>Relocate range gas line</Typography>
        <Muted>Change order 4 · sent Oct 27 by Marcus Bell</Muted>
      </Stack>
      <PCard>
        <Typography>We found the gas line in the path of your new island. Moving it now keeps the cabinet install on track and meets code.</Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
          {[
            ["Price change", <Num key="p">+$1,840</Num>],
            ["Schedule", "+2 days"],
          ].map(([k, val]) => (
            <Stack key={k as string} sx={{ p: 1.75, borderRadius: "12px", bgcolor: tokens.surfaceMuted, border: `1px solid ${tokens.border}` }}>
              <Muted sx={{ fontSize: 13 }}>{k}</Muted>
              <Box sx={{ fontSize: 22, fontWeight: 500 }}>{val}</Box>
            </Stack>
          ))}
        </Box>
      </PCard>
      <PCard sx={{ gap: 0 }}>
        <PH2>Your contract after this change</PH2>
        <Ln muted k="Current contract" v="$89,650.00" />
        <Ln muted k="This change" v="+$1,840.00" />
        <Ln strong k="New contract total" v="$91,490.00" />
        <Ln muted k="New estimated finish" v={<Box component="span" sx={{ fontFamily: "inherit" }}>Dec 22, 2026</Box>} />
      </PCard>
      <Details summary="See the breakdown">
        <Ln k="Licensed plumber — reroute & test" v="$600.00" />
        <Ln k="Carpentry — open & patch subfloor" v="$570.00" />
        <Ln k="Pipe, fittings & shutoff" v="$480.00" />
        <Ln k="City gas permit" v="$190.00" />
      </Details>
      <PCard>
        <Formik
          initialValues={{ name: "", agree: false }}
          validationSchema={Yup.object({
            name: Yup.string().trim().required("Type your full name to approve.").test("match", "Type your name as it appears on the contract (Priya Shah).", (n) => !n || n.trim().toLowerCase() === "priya shah"),
            agree: Yup.boolean().oneOf([true], "Tick the box to confirm you approve this change."),
          })}
          onSubmit={() => router.push(`/portal/${token}/verify?for=change-order`)}
        >
          <Form noValidate style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <PH2>Approve this change</PH2>
            <FormikTextField name="name" label="Type your full name" autoComplete="name" sx={{ "& input": { height: 48 } }} />
            <FormikCheckbox name="agree" label="I approve this change to my contract, including the new total of $91,490.00." />
            <Button type="submit" variant="contained" color="primary" sx={bigBtn}>
              Approve change
            </Button>
            <Button sx={bigBtn}>Decline</Button>
            <Muted sx={{ fontSize: 13, textAlign: "center" }}>We&apos;ll send a code to p•••••@gmail.com to confirm it&apos;s you.</Muted>
          </Form>
        </Formik>
      </PCard>
      <Muted sx={{ textAlign: "center" }}>
        Questions? <Link href={`/portal/${token}#team`}>Contact Marcus</Link>
      </Muted>
    </PortalShell>
  );
}

function OtpInput() {
  const { values, setFieldValue, errors, submitCount } = useFormikContext<{ code: string[] }>();
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const set = (i: number, ch: string) => {
    const next = [...values.code];
    next[i] = ch;
    setFieldValue("code", next);
  };
  return (
    <Box component="fieldset" sx={{ border: 0, p: 0, m: 0 }}>
      <Box component="legend" sx={{ fontSize: 14, fontWeight: 500, mb: 1.25 }}>
        Verification code
      </Box>
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0,1fr))", gap: 1 }}>
        {values.code.map((d, i) => (
          <Box
            key={i}
            component="input"
            ref={(el: HTMLInputElement | null) => {
              refs.current[i] = el;
            }}
            aria-label={`Digit ${i + 1}`}
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            maxLength={1}
            value={d}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const ch = e.target.value.replace(/\D/g, "").slice(-1);
              set(i, ch);
              if (ch && i < 5) refs.current[i + 1]?.focus();
            }}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
              if (e.key === "Backspace" && !d && i > 0) refs.current[i - 1]?.focus();
            }}
            onPaste={(e: React.ClipboardEvent<HTMLInputElement>) => {
              const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6).split("");
              if (digits.length) {
                e.preventDefault();
                setFieldValue("code", [...digits, ...Array(6 - digits.length).fill("")]);
                refs.current[Math.min(digits.length, 5)]?.focus();
              }
            }}
            sx={{ width: "100%", height: 56, border: `1px solid ${submitCount && errors.code ? tokens.danger : tokens.borderStrong}`, borderRadius: "12px", textAlign: "center", typography: "num", fontSize: 24, fontWeight: 500, color: tokens.ink, bgcolor: "#fff", "&:focus": { outline: "none", borderColor: tokens.brand, boxShadow: `0 0 0 3px ${tokens.brandRing}` } }}
          />
        ))}
      </Box>
      {submitCount > 0 && typeof errors.code === "string" && (
        <Box role="alert" sx={{ color: tokens.danger, fontSize: 13, mt: 1 }}>
          {errors.code}
        </Box>
      )}
    </Box>
  );
}

export function PortalVerify({ token }: { token: string }) {
  const [done, setDone] = useState(false);
  return (
    <PortalShell token={token} subtitle="Secure approval" tabs={false} contact={false}>
      {!done ? (
        <>
          <PCard sx={{ gap: 2.25, p: 3 }}>
            <IconTile tone="brand" size={52}>
              <MailOutline />
            </IconTile>
            <Stack gap={0.75}>
              <Typography sx={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.03em" }}>Confirm it&apos;s you</Typography>
              <Muted>
                We sent a 6-digit code to <strong style={{ color: tokens.ink }}>p•••••@gmail.com</strong>. It expires in 10 minutes.
              </Muted>
            </Stack>
            <Formik
              initialValues={{ code: ["", "", "", "", "", ""] }}
              validationSchema={Yup.object({ code: Yup.array().test("full", "Enter all 6 digits.", (c) => (c ?? []).every((d) => /^\d$/.test(String(d)))) })}
              onSubmit={() => setDone(true)}
            >
              <Form noValidate style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <OtpInput />
                <Button type="submit" variant="contained" color="primary" sx={bigBtn}>
                  Confirm &amp; approve
                </Button>
              </Form>
            </Formik>
            <Stack direction="row" justifyContent="space-between" flexWrap="wrap" gap={1.5} sx={{ fontSize: 14 }}>
              <Muted>Didn&apos;t get it? Resend in 0:45</Muted>
              <a href="#">Text me instead</a>
            </Stack>
          </PCard>
          <Stack direction="row" gap={1.25} sx={{ p: 2, borderRadius: "12px", bgcolor: "#fff", border: `1px solid ${tokens.border}`, fontSize: 14 }}>
            <LockOutlined sx={{ fontSize: 18, color: "text.secondary", mt: "2px" }} />
            <Muted>
              You&apos;re approving <strong style={{ color: tokens.ink }}>Change order 4 · +$1,840.00</strong>. We record your name, email and the time as proof of approval.
            </Muted>
          </Stack>
        </>
      ) : (
        <PCard role="status" sx={{ alignItems: "center", textAlign: "center", p: 4 }}>
          <Box sx={{ width: 64, height: 64, borderRadius: "50%", bgcolor: "#E7F4EC", color: "#166534", display: "grid", placeItems: "center" }}>
            <CheckOutlined sx={{ fontSize: 30 }} />
          </Box>
          <Typography sx={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.03em" }}>Change approved</Typography>
          <Muted>
            Thanks, Priya. Your new contract total is <strong style={{ color: tokens.ink }}>$91,490.00</strong>. Marcus has been notified and a copy is in your documents.
          </Muted>
          <Button component={Link} href={`/portal/${token}`} variant="contained" color="primary" fullWidth sx={bigBtn}>
            Back to my project
          </Button>
        </PCard>
      )}
    </PortalShell>
  );
}

export function PortalExpired() {
  const [sent, setSent] = useState(false);
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: tokens.bg, display: "flex", flexDirection: "column" }}>
      <Stack component="main" gap={2.5} sx={{ flex: 1, width: "100%", maxWidth: 440, mx: "auto", px: 2, py: 8 }}>
        <IconTile size={56}>
          <LinkOffOutlined />
        </IconTile>
        <Typography sx={{ fontSize: 26, fontWeight: 600, letterSpacing: "-0.03em" }}>This link isn&apos;t available</Typography>
        <Muted>It may have expired or been replaced with a new one. For your privacy, we can&apos;t show any details here.</Muted>
        {sent ? (
          <Box role="status" sx={{ p: 2, borderRadius: "12px", bgcolor: "#E7F4EC", color: "#14532D" }}>
            If that email matches an active project, a new link will arrive in a few minutes.
          </Box>
        ) : (
          <Formik initialValues={{ email: "" }} validationSchema={Yup.object({ email: v.email() })} onSubmit={() => setSent(true)}>
            <Form noValidate style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <FormikTextField name="email" label="Get a fresh link" type="email" placeholder="Email your contractor has on file" autoComplete="email" />
              <Button type="submit" sx={bigBtn}>
                Send me a new link
              </Button>
              <Muted sx={{ fontSize: 13 }}>If that email matches an active project, a new link will arrive in a few minutes.</Muted>
            </Form>
          </Formik>
        )}
      </Stack>
      <Box component="footer" sx={{ textAlign: "center", py: 2.5, fontSize: 12, color: "text.secondary" }}>
        Powered by ContractorOS
      </Box>
    </Box>
  );
}
