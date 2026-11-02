"use client";

import CheckOutlined from "@mui/icons-material/CheckOutlined";
import ExpandMoreOutlined from "@mui/icons-material/ExpandMoreOutlined";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Form, Formik } from "formik";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { FieldRow, FormikSelect, FormikTextField } from "@web/components/form";
import { Logo, Muted, Num, StatusTag } from "@web/components/ui";
import { v, Yup } from "@web/lib/validation";
import { tokens } from "@web/theme/tokens";

const Wrap = ({ children, id, dark, sx }: { children: ReactNode; id?: string; dark?: boolean; sx?: object }) => (
  <Box component="section" id={id} sx={{ bgcolor: dark ? "#121418" : undefined, color: dark ? "#fff" : undefined, py: { xs: 8, md: 12 }, ...sx }}>
    <Box sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2.5, md: 4 } }}>{children}</Box>
  </Box>
);
const Eyebrow = ({ children, dark }: { children: ReactNode; dark?: boolean }) => <Box sx={{ fontSize: 13, fontWeight: 500, color: dark ? "#F5C9B1" : tokens.brand, mb: 1.5 }}>{children}</Box>;
const H2 = ({ children }: { children: ReactNode }) => <Typography sx={{ fontSize: { xs: 30, md: 40 }, fontWeight: 600, letterSpacing: "-0.035em", lineHeight: 1.1 }}>{children}</Typography>;

const PAINS = [
  ["No more spreadsheet estimates", "Itemized pricing with versions, tax and protected margins."],
  ["No more “I never approved that”", "Change orders the homeowner reviews and signs."],
  ["No more chasing payments", "Milestone invoices with online card and ACH payment."],
  ["No more “what's the status?” calls", "A private project link with updates and photos."],
];
const STEPS = [
  ["Capture the lead", "Track source, owner and follow-ups in a visual pipeline."],
  ["Estimate & propose", "Build line items, issue a locked version, send a branded proposal."],
  ["Sign & start", "E-signature creates the project with team, schedule and payment plan."],
  ["Build & change", "Tasks, crews and approved change orders keep the contract current."],
  ["Invoice & get paid", "Milestone invoices, online payments and QuickBooks sync."],
];
const FEATURES = [
  ["Estimates that protect your margin", "Labor, material, allowance and sub lines with tax. Internal cost and margin stay visible only to the roles you choose."],
  ["Proposals & e-signature", "Send the exact estimate version for review and signature. Every view and signature is recorded as evidence."],
  ["Change orders, approved in writing", "Price and schedule impact shown up front. Only approved changes update the contract value."],
  ["Crew scheduling", "See every crew's week, drag work into place and catch double-bookings before they hit the job site."],
  ["Invoices & online payments", "Deposit, progress and final invoices from your payment schedule. Homeowners pay by card or ACH through Stripe."],
  ["QuickBooks Online sync", "Customers, invoices and payments flow to your books, with a clear log and one-click retry when something needs attention."],
];
const FAQ = [
  ["Do homeowners need to create an account?", "No. Each project has a private link. For anything binding — approving a change or signing — we confirm it's them with a one-time code."],
  ["Does it work on phones and tablets?", "Yes. ContractorOS runs in any modern browser on desktop, tablet and phone. Native apps are planned for a later phase."],
  ["Can my field crew see job costs?", "Not unless you allow it. Field workers see their assigned projects and tasks; costs and margins are limited to the roles you choose."],
  ["How do customer payments work?", "Homeowners pay invoices by card or ACH on a secure Stripe page. Balances update automatically once Stripe confirms the payment."],
  ["Does it replace QuickBooks?", "No — it works with it. ContractorOS handles estimates, projects and invoicing, and sends customers, invoices and payments to QuickBooks Online."],
];
const Check = ({ children, dark }: { children: ReactNode; dark?: boolean }) => (
  <Stack direction="row" gap={1.25} alignItems="flex-start">
    <CheckOutlined sx={{ fontSize: 18, mt: "2px", color: dark ? "#F0875A" : tokens.brand }} />
    <Box sx={{ color: dark ? "#D4D7DD" : tokens.ink2 }}>{children}</Box>
  </Stack>
);

function PilotForm() {
  const [done, setDone] = useState(false);
  if (done)
    return (
      <Box role="status" sx={{ p: 2.5, borderRadius: "12px", bgcolor: "#163322", color: "#86EFAC" }}>
        Thanks — we&apos;ll be in touch about the pilot.
      </Box>
    );
  return (
    <Formik
      initialValues={{ email: "", company: "", size: "" }}
      validationSchema={Yup.object({ email: v.email(), company: v.required("Company name"), size: Yup.string().required("Choose your team size.") })}
      onSubmit={() => setDone(true)}
    >
      <Form noValidate>
        <Stack gap={1.5} sx={{ "& label": { color: "#D4D7DD !important" } }}>
          <FieldRow min={200}>
            <FormikTextField name="email" label="Work email" type="email" placeholder="you@company.com" />
            <FormikTextField name="company" label="Company" />
            <FormikSelect name="size" label="Team size" options={["1–9", "10–24", "25–50", "50+"]} />
          </FieldRow>
          <Box>
            <Button type="submit" variant="contained" color="primary" sx={{ height: 44 }}>
              Request access
            </Button>
          </Box>
          <Box sx={{ fontSize: 13, color: "#9A9FA8" }}>We&apos;ll reply within [X] business days. No spam.</Box>
        </Stack>
      </Form>
    </Formik>
  );
}

export function LandingView() {
  return (
    <Box sx={{ bgcolor: tokens.bg }}>
      <Box component="header" sx={{ position: "sticky", top: 0, zIndex: 10, bgcolor: "rgba(246,246,243,.9)", backdropFilter: "blur(8px)", borderBottom: `1px solid ${tokens.border}` }}>
        <Stack direction="row" alignItems="center" gap={3} sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2.5, md: 4 }, height: 64 }}>
          <Logo />
          <Stack component="nav" direction="row" gap={3} sx={{ display: { xs: "none", md: "flex" }, fontSize: 14, "& a": { color: tokens.ink2 } }}>
            <a href="#how">How it works</a>
            <a href="#features">Features</a>
            <a href="#portal">Homeowner portal</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
          </Stack>
          <Stack direction="row" gap={1} sx={{ ml: "auto" }}>
            <Button component={Link} href="/login" variant="text">
              Sign in
            </Button>
            <Button href="#pilot" variant="contained" color="primary">
              Join the pilot
            </Button>
          </Stack>
        </Stack>
      </Box>

      <Wrap sx={{ pt: { xs: 6, md: 10 } }}>
        <Box sx={{ display: "grid", gap: 6, alignItems: "center", gridTemplateColumns: { xs: "1fr", md: "1.1fr 1fr" } }}>
          <Stack gap={2.5}>
            <Box>
              <StatusTag tone="brand">Now accepting private pilot companies</StatusTag>
            </Box>
            <Typography component="h1" sx={{ fontSize: { xs: 44, md: 64 }, fontWeight: 600, letterSpacing: "-0.045em", lineHeight: 1.02 }}>
              One Platform. Every Project.
            </Typography>
            <Typography sx={{ fontSize: 18, color: tokens.ink2, maxWidth: 540 }}>ContractorOS runs your remodeling business from first call to final payment — leads, estimates, contracts, change orders, invoices and homeowner updates, all connected.</Typography>
            <Stack direction="row" gap={1} flexWrap="wrap">
              <Button href="#pilot" variant="contained" color="primary" size="large">
                Join the private pilot
              </Button>
              <Button href="#how" size="large">
                See how it works
              </Button>
            </Stack>
            <Muted sx={{ fontSize: 13 }}>Built for US residential remodelers with 10–50 people.</Muted>
          </Stack>
          <Stack gap={1.5} sx={{ position: "relative" }}>
            <Card sx={{ p: 2.5, borderRadius: "16px", display: "flex", flexDirection: "column", gap: 2, boxShadow: "0 24px 48px rgba(16,24,40,.12)" }}>
              <Stack direction="row" justifyContent="space-between">
                <Box sx={{ fontWeight: 600 }}>Shah Kitchen Remodel</Box>
                <StatusTag tone="success">Active</StatusTag>
              </Stack>
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 1.5 }}>
                {[
                  ["Contract", "$89,650"],
                  ["Paid", "$40,920"],
                  ["Balance", "$14,170"],
                ].map(([k, val]) => (
                  <Stack key={k}>
                    <Muted sx={{ fontSize: 12 }}>{k}</Muted>
                    <Num sx={{ fontSize: 18, fontWeight: 500 }}>{val}</Num>
                  </Stack>
                ))}
              </Box>
              <Stack gap={1} sx={{ fontSize: 13.5 }}>
                <Muted sx={{ fontSize: 12 }}>Milestones</Muted>
                <Check>Rough-in inspections passed</Check>
                <Stack direction="row" gap={1.25}>
                  <Box sx={{ width: 18, height: 18, borderRadius: "50%", bgcolor: tokens.brand }} />
                  Cabinets installed · Nov 4
                </Stack>
                <Stack direction="row" gap={1.25} sx={{ color: "text.secondary" }}>
                  <Box sx={{ width: 18, height: 18, borderRadius: "50%", border: "1.5px solid #C9C7BF" }} />
                  Countertops · Nov 20
                </Stack>
              </Stack>
            </Card>
            <Card sx={{ p: 1.75, borderRadius: "14px", ml: { md: 6 }, display: "flex", gap: 1.5, alignItems: "center" }}>
              <Box sx={{ width: 28, height: 28, borderRadius: "50%", bgcolor: "#16A34A", color: "#fff", display: "grid", placeItems: "center" }}>
                <CheckOutlined sx={{ fontSize: 15 }} />
              </Box>
              <Stack sx={{ fontSize: 13 }}>
                <strong>Change order approved</strong>
                <Muted>Priya Shah · +$1,840 · just now</Muted>
              </Stack>
            </Card>
            <Card sx={{ p: 1.75, borderRadius: "14px", mr: { md: 6 }, fontSize: 13, fontWeight: 500 }}>
              Payment received · <Num>$15,000.00</Num>
            </Card>
          </Stack>
        </Box>
      </Wrap>

      <Box sx={{ borderTop: `1px solid ${tokens.border}`, borderBottom: `1px solid ${tokens.border}`, bgcolor: "#fff" }}>
        <Box sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2.5, md: 4 }, py: 5, display: "grid", gap: 3, gridTemplateColumns: "repeat(auto-fit, minmax(min(240px,100%),1fr))" }}>
          {PAINS.map(([t, s]) => (
            <Stack key={t} gap={0.5}>
              <Box sx={{ fontWeight: 600 }}>{t}</Box>
              <Muted sx={{ fontSize: 14 }}>{s}</Muted>
            </Stack>
          ))}
        </Box>
      </Box>

      <Wrap id="how">
        <Eyebrow>How it works</Eyebrow>
        <H2>One connected workflow. Nothing re-typed.</H2>
        <Muted sx={{ display: "block", mt: 1.5, fontSize: 17, maxWidth: 620 }}>Every step carries the customer, property, prices and documents forward to the next one.</Muted>
        <Box sx={{ mt: 6, display: "grid", gap: 2, gridTemplateColumns: "repeat(auto-fit, minmax(min(200px,100%),1fr))" }}>
          {STEPS.map(([t, s], i) => (
            <Card key={t} sx={{ p: 2.5, display: "flex", flexDirection: "column", gap: 1 }}>
              <Num sx={{ color: tokens.brand, fontWeight: 500 }}>{String(i + 1).padStart(2, "0")}</Num>
              <Box sx={{ fontWeight: 600, fontSize: 16 }}>{t}</Box>
              <Muted sx={{ fontSize: 14 }}>{s}</Muted>
            </Card>
          ))}
        </Box>
      </Wrap>

      <Wrap id="features" sx={{ bgcolor: "#fff" }}>
        <Eyebrow>Features</Eyebrow>
        <H2>Everything a remodeling office runs on.</H2>
        <Box sx={{ mt: 6, display: "grid", gap: 4, gridTemplateColumns: "repeat(auto-fit, minmax(min(320px,100%),1fr))" }}>
          {FEATURES.map(([t, s]) => (
            <Stack key={t} gap={1} sx={{ borderTop: `2px solid ${tokens.ink}`, pt: 2 }}>
              <Box sx={{ fontWeight: 600, fontSize: 17 }}>{t}</Box>
              <Muted>{s}</Muted>
            </Stack>
          ))}
        </Box>
      </Wrap>

      <Wrap id="portal" dark>
        <Box sx={{ display: "grid", gap: 6, alignItems: "center", gridTemplateColumns: { xs: "1fr", md: "1.2fr 1fr" } }}>
          <Stack gap={2}>
            <Eyebrow dark>Homeowner portal</Eyebrow>
            <H2>Give homeowners answers before they call.</H2>
            <Typography sx={{ color: "#B4B8C0", fontSize: 17 }}>Each project gets a private link — no account or password. Homeowners see progress, photos, documents and what they owe, and approve changes from their phone.</Typography>
            <Stack gap={1.25}>
              <Check dark>You choose exactly which photos and documents they see</Check>
              <Check dark>Costs, margins and internal notes are never shown</Check>
              <Check dark>Approvals confirmed with a one-time email code</Check>
              <Check dark>Revoke or replace a link anytime</Check>
            </Stack>
            <Box component={Link} href="/portal/demo" sx={{ color: "#F0875A", fontWeight: 500 }}>
              Preview the homeowner view →
            </Box>
          </Stack>
          <Box sx={{ mx: "auto", width: 300, borderRadius: "36px", border: "8px solid #2A2E35", bgcolor: tokens.bg, color: tokens.ink, p: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
            <Stack direction="row" gap={1} alignItems="center">
              <Box sx={{ width: 32, height: 32, borderRadius: "8px", bgcolor: "#3A2A22", color: "#F5C9B1", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 600 }}>HP</Box>
              <Box sx={{ fontWeight: 600, fontSize: 14 }}>Harbor &amp; Pine</Box>
            </Stack>
            <Card sx={{ p: 1.5 }}>
              <Box sx={{ fontWeight: 600 }}>Kitchen remodel</Box>
              <Muted sx={{ fontSize: 12.5 }}>58% · Est. finish Dec 18</Muted>
            </Card>
            <Card sx={{ p: 1.5 }}>
              <Box sx={{ fontWeight: 600, fontSize: 14 }}>Review a change</Box>
              <Muted sx={{ fontSize: 12.5 }}>+$1,840 · gas line</Muted>
            </Card>
            <Button variant="contained" color="primary" sx={{ height: 44 }}>
              Pay $14,170.00
            </Button>
          </Box>
        </Box>
      </Wrap>

      <Wrap>
        <Box sx={{ display: "grid", gap: 6, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
          <Stack gap={2}>
            <Eyebrow>Built for your team</Eyebrow>
            <H2>The right access for every role.</H2>
            <Muted sx={{ fontSize: 16 }}>Owners, office admins, sales, estimators, project managers, field crews and your bookkeeper each see what they need — and nothing they shouldn&apos;t.</Muted>
            <Stack direction="row" gap={0.75} flexWrap="wrap">
              {["Owner", "Admin", "Sales", "Estimator", "Project manager", "Field", "Accountant"].map((r) => (
                <Box key={r} sx={{ px: 1.25, height: 30, display: "inline-flex", alignItems: "center", borderRadius: "8px", border: `1px solid ${tokens.border}`, bgcolor: "#fff", fontSize: 13.5, fontWeight: 500 }}>
                  {r}
                </Box>
              ))}
            </Stack>
          </Stack>
          <Stack gap={2}>
            <Eyebrow>Built to be trusted</Eyebrow>
            <H2>Your numbers stay yours.</H2>
            <Stack gap={1.25}>
              <Check>Each company&apos;s data is kept separate from every other company</Check>
              <Check>Card and bank details are handled by Stripe — never stored by us</Check>
              <Check>Issued estimates, contracts and invoices can&apos;t be quietly edited</Check>
              <Check>An audit log of every financial and permission change</Check>
            </Stack>
          </Stack>
        </Box>
        <Box component="figure" sx={{ m: 0, mt: 10, textAlign: "center" }}>
          <Typography component="blockquote" sx={{ m: 0, fontSize: { xs: 22, md: 28 }, fontWeight: 500, letterSpacing: "-0.02em", maxWidth: 820, mx: "auto" }}>
            “[PILOT CUSTOMER QUOTE — add once a pilot company agrees to be quoted]”
          </Typography>
          <Muted component="figcaption" sx={{ display: "block", mt: 2 }}>
            [NAME] [TITLE], [COMPANY]
          </Muted>
        </Box>
      </Wrap>

      <Wrap id="pricing" sx={{ bgcolor: "#fff" }}>
        <Box sx={{ textAlign: "center" }}>
          <Eyebrow>Pricing</Eyebrow>
          <H2>Simple plans that grow with your crew.</H2>
          <Muted sx={{ display: "block", mt: 1.5 }}>Monthly subscription. No per-project fees.</Muted>
        </Box>
        <Box sx={{ mt: 6, display: "grid", gap: 3, maxWidth: 820, mx: "auto", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
          {[
            { name: "Starter", items: ["Leads, customers & estimates", "Projects, tasks & scheduling", "Invoices & online payments", "Homeowner portal"] },
            { name: "Growth", popular: true, items: ["Everything in Starter", "Proposals with e-signature", "Change orders with homeowner approval", "QuickBooks Online sync & reports"] },
          ].map((p) => (
            <Card key={p.name} sx={{ p: 3.5, display: "flex", flexDirection: "column", gap: 2, borderRadius: "16px", ...(p.popular ? { borderColor: tokens.brand, boxShadow: `0 0 0 3px ${tokens.brandRing}` } : {}) }}>
              {p.popular && (
                <Box>
                  <StatusTag tone="brand" dot={false}>
                    Most popular
                  </StatusTag>
                </Box>
              )}
              <Stack>
                <Box sx={{ fontWeight: 600, fontSize: 20 }}>{p.name}</Box>
                <Muted>For teams up to [SEATS] people</Muted>
              </Stack>
              <Box>
                <Num sx={{ fontSize: 32, fontWeight: 500 }}>[PRICE]</Num> <Muted>/ month</Muted>
              </Box>
              <Stack gap={1}>
                {p.items.map((i) => (
                  <Check key={i}>{i}</Check>
                ))}
              </Stack>
              <Button href="#pilot" variant={p.popular ? "contained" : "outlined"} color={p.popular ? "primary" : "inherit"} sx={{ mt: "auto", height: 44 }}>
                Join the pilot
              </Button>
            </Card>
          ))}
        </Box>
      </Wrap>

      <Wrap id="faq">
        <Box sx={{ display: "grid", gap: 5, gridTemplateColumns: { xs: "1fr", md: "1fr 2fr" } }}>
          <Stack>
            <Eyebrow>FAQ</Eyebrow>
            <H2>Questions from contractors</H2>
          </Stack>
          <Stack gap={1}>
            {FAQ.map(([q, a]) => (
              <Accordion key={q} disableGutters elevation={0} sx={{ border: `1px solid ${tokens.border}`, borderRadius: "12px !important", "&:before": { display: "none" } }}>
                <AccordionSummary expandIcon={<ExpandMoreOutlined />} sx={{ fontWeight: 600, minHeight: 56 }}>
                  {q}
                </AccordionSummary>
                <AccordionDetails>
                  <Muted>{a}</Muted>
                </AccordionDetails>
              </Accordion>
            ))}
          </Stack>
        </Box>
      </Wrap>

      <Wrap id="pilot" dark>
        <Box sx={{ maxWidth: 760 }}>
          <H2>Run every project from one place.</H2>
          <Typography sx={{ color: "#B4B8C0", fontSize: 17, mt: 1.5, mb: 4 }}>We&apos;re onboarding a small group of remodeling companies for our private pilot. Tell us about your team.</Typography>
          <PilotForm />
        </Box>
      </Wrap>

      <Box component="footer" sx={{ borderTop: `1px solid ${tokens.border}` }}>
        <Stack direction={{ xs: "column", md: "row" }} gap={2} alignItems={{ md: "center" }} sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2.5, md: 4 }, py: 4, fontSize: 13.5 }}>
          <Muted>ContractorOS · One Platform. Every Project.</Muted>
          <Stack direction="row" gap={2.5} sx={{ ml: { md: "auto" }, "& a": { color: tokens.ink2 } }}>
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <Link href="/login">Sign in</Link>
          </Stack>
          <Muted>© 2026 ContractorOS</Muted>
        </Stack>
      </Box>
    </Box>
  );
}
