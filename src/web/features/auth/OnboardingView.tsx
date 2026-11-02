"use client";

import AddOutlined from "@mui/icons-material/AddOutlined";
import CheckOutlined from "@mui/icons-material/CheckOutlined";
import DeleteOutline from "@mui/icons-material/DeleteOutline";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { FieldArray, Form, Formik, type FormikProps } from "formik";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AnyObject, ObjectSchema } from "yup";
import { FieldRow, FormikSelect, FormikTextField } from "@web/components/form";
import { Logo, Muted } from "@web/components/ui";
import { TIME_ZONES } from "@web/features/settings/SettingsView";
import { v, Yup } from "@web/lib/validation";
import { tokens } from "@web/theme/tokens";

const STATES = ["Texas", "Arizona", "Colorado", "Florida", "Georgia", "North Carolina", "Oklahoma", "Tennessee"];
const STEPS = [
  { title: "Company profile", sub: "Harbor & Pine Remodeling" },
  { title: "Location & preferences", sub: "Time zone, numbering" },
  { title: "Invite your team", sub: "Optional" },
  { title: "Accept online payments", sub: "Stripe · can skip" },
  { title: "Connect QuickBooks", sub: "Optional" },
];

const initialValues = {
  company: "Harbor & Pine Remodeling",
  phone: "",
  trade: "Remodeling",
  address: "",
  city: "Austin",
  state: "Texas",
  zip: "",
  timeZone: TIME_ZONES[1]!,
  currency: "USD — US dollar",
  estPrefix: "EST-2001",
  invPrefix: "INV-3001",
  projPrefix: "P-1001",
  invites: [{ email: "", role: "Estimator" }],
};
type Values = typeof initialValues;

const numbering = (label: string) =>
  Yup.string()
    .trim()
    .matches(/^[A-Z]{1,5}-\d{1,6}$/, `${label}: use LETTERS-NUMBER, like EST-2001.`)
    .required(`${label} start number is required.`);

const SCHEMAS: ObjectSchema<AnyObject>[] = [
  Yup.object({ company: v.required("Company name"), phone: v.phone().required("Business phone is required."), trade: Yup.string().required() }),
  Yup.object({ address: v.required("Business address"), city: v.required("City"), state: v.required("State"), zip: v.zip().required("ZIP code is required."), timeZone: Yup.string().required(), estPrefix: numbering("Estimates"), invPrefix: numbering("Invoices"), projPrefix: numbering("Projects") }),
  Yup.object({
    invites: Yup.array().of(Yup.object({ email: Yup.string().trim().email("Enter a valid email address."), role: Yup.string() })),
  }),
  Yup.object({}),
  Yup.object({}),
];

function StepBody({ step, f }: { step: number; f: FormikProps<Values> }) {
  switch (step) {
    case 0:
      return (
        <>
          <FormikTextField name="company" label="Company name" />
          <FieldRow>
            <FormikTextField name="phone" label="Business phone" type="tel" />
            <FormikSelect name="trade" label="Main type of work" options={["Remodeling", "Kitchen & bath", "Additions & ADUs", "Outdoor & decks", "General contracting"]} />
          </FieldRow>
        </>
      );
    case 1:
      return (
        <>
          <FormikTextField name="address" label="Business address" placeholder="2210 E Cesar Chavez St, Suite 4" />
          <FieldRow min={150}>
            <FormikTextField name="city" label="City" />
            <FormikSelect name="state" label="State" options={STATES} />
            <FormikTextField name="zip" label="ZIP code" inputMode="numeric" />
          </FieldRow>
          <FieldRow min={220}>
            <FormikSelect name="timeZone" label="Time zone" options={TIME_ZONES} hint="Dates, reminders and schedules use this zone." />
            <FormikSelect name="currency" label="Currency" options={["USD — US dollar"]} disabled hint="USD during the pilot." />
          </FieldRow>
          <Box component="fieldset" sx={{ border: `1px solid ${tokens.divider}`, borderRadius: "12px", p: 2.25, m: 0, display: "flex", flexDirection: "column", gap: 1.75, bgcolor: tokens.surfaceMuted }}>
            <Box component="legend" sx={{ fontSize: 13, fontWeight: 500, px: 0.75 }}>
              Document numbering
            </Box>
            <FieldRow min={140}>
              {(
                [
                  ["estPrefix", "Estimates"],
                  ["invPrefix", "Invoices"],
                  ["projPrefix", "Projects"],
                ] as const
              ).map(([n, l]) => (
                <FormikTextField key={n} name={n} label={l} sx={{ "& input": { typography: "num" } }} onChange={(e) => f.setFieldValue(n, e.target.value.toUpperCase())} />
              ))}
            </FieldRow>
            <Muted sx={{ fontSize: 12 }}>Numbers are issued in sequence and never reused, even after a void.</Muted>
          </Box>
        </>
      );
    case 2:
      return (
        <FieldArray name="invites">
          {(h) => (
            <Stack gap={1.5}>
              {f.values.invites.map((_, i) => (
                <Box key={i} sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "minmax(0,1fr) 180px 40px" }, gap: 1, alignItems: "start" }}>
                  <FormikTextField name={`invites.${i}.email`} placeholder="name@company.com" type="email" aria-label="Email" />
                  <FormikSelect name={`invites.${i}.role`} options={["Sales", "Estimator", "Project Manager", "Field Worker", "Accountant"]} aria-label="Role" />
                  <IconButton aria-label="Remove" onClick={() => h.remove(i)} disabled={f.values.invites.length === 1}>
                    <DeleteOutline fontSize="small" />
                  </IconButton>
                </Box>
              ))}
              <Box>
                <Button variant="text" size="small" startIcon={<AddOutlined />} onClick={() => h.push({ email: "", role: "Estimator" })}>
                  Add another
                </Button>
              </Box>
              <Muted sx={{ fontSize: 13 }}>Leave blank to skip — you can invite people later from Team &amp; roles.</Muted>
            </Stack>
          )}
        </FieldArray>
      );
    case 3:
      return (
        <Stack gap={1.5}>
          <Typography>Connect Stripe so homeowners can pay invoices by card or bank transfer from their portal. Payouts go straight to your bank.</Typography>
          <Box>
            <Button variant="contained" sx={{ bgcolor: "#635BFF", "&:hover": { bgcolor: "#4F46E5" }, border: 0 }}>
              Connect with Stripe
            </Button>
          </Box>
        </Stack>
      );
    default:
      return (
        <Stack gap={1.5}>
          <Typography>Send customers, invoices and payments to QuickBooks Online automatically. Sync runs in the background with retries.</Typography>
          <Box>
            <Button variant="contained" sx={{ bgcolor: "#2CA01C", "&:hover": { bgcolor: "#23801A" }, border: 0 }}>
              Connect QuickBooks
            </Button>
          </Box>
        </Stack>
      );
  }
}

const HEAD = [
  ["Tell us about your company", "This appears on estimates, invoices and the customer portal."],
  ["Where does your team work?", "Used on estimates and invoices, and to set due dates and schedule times."],
  ["Invite your team", "Give people the access their role needs. They'll get an email to join."],
  ["Accept online payments", "Optional — you can connect Stripe any time from Integrations."],
  ["Connect QuickBooks", "Optional — keep your books in sync without double entry."],
];

export function OnboardingView() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const last = step === STEPS.length - 1;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: tokens.bg, display: "flex", flexDirection: "column" }}>
      <Stack component="header" direction="row" justifyContent="space-between" alignItems="center" gap={2} sx={{ px: { xs: 2, md: 4 }, py: 1.75, bgcolor: "#fff", borderBottom: `1px solid ${tokens.border}` }}>
        <Logo />
        <Muted sx={{ fontSize: 13 }}>
          dana@harborpine.com · <Link href="/login">Sign out</Link>
        </Muted>
      </Stack>
      <Box component="main" sx={{ width: "100%", maxWidth: 1080, mx: "auto", px: 3, pt: 6, pb: 9, display: "flex", flexWrap: "wrap", gap: 5, alignItems: "flex-start" }}>
        <Stack gap={2.5} sx={{ flex: "1 1 260px" }}>
          <Stack gap={0.75}>
            <Box sx={{ fontSize: 13, fontWeight: 500, color: tokens.brand }}>Get set up · about 4 minutes</Box>
            <Typography variant="h2">Your workspace</Typography>
          </Stack>
          <Box component="nav" aria-label="Setup steps">
            <Stack component="ol" gap={0.5} sx={{ m: 0, p: 0, listStyle: "none" }}>
              {STEPS.map((s, i) => {
                const done = i < step;
                const on = i === step;
                return (
                  <Box
                    component="li"
                    key={s.title}
                    aria-current={on ? "step" : undefined}
                    onClick={() => done && setStep(i)}
                    sx={{ display: "flex", alignItems: "center", gap: 1.5, minHeight: 56, px: 1.5, borderRadius: "10px", cursor: done ? "pointer" : "default", ...(on ? { bgcolor: "#fff", border: `1px solid ${tokens.border}`, boxShadow: "0 1px 2px rgba(16,24,40,.04)" } : {}) }}
                  >
                    <Box sx={{ width: 28, height: 28, borderRadius: "50%", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 600, flex: "none", ...(done ? { bgcolor: tokens.ink, color: "#fff" } : on ? { bgcolor: tokens.brand, color: "#fff" } : { border: "1.5px solid #C9C7BF", color: "text.secondary" }) }}>
                      {done ? <CheckOutlined sx={{ fontSize: 14 }} /> : i + 1}
                    </Box>
                    <Stack>
                      <Box sx={{ fontWeight: 500 }}>{s.title}</Box>
                      <Muted sx={{ fontSize: 12 }}>{s.sub}</Muted>
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
          </Box>
        </Stack>

        <Formik<Values>
          initialValues={initialValues}
          validationSchema={SCHEMAS[step]}
          onSubmit={(_, { setTouched }) => {
            setTouched({});
            if (last) router.push("/dashboard");
            else setStep((s) => s + 1);
          }}
        >
          {(f) => (
            <Card component={Form} noValidate sx={{ flex: "999 1 540px", minWidth: 0, borderRadius: "16px", display: "flex", flexDirection: "column" }}>
              <Stack gap={0.75} sx={{ px: 4, pt: 4, pb: 1 }}>
                <Muted sx={{ fontSize: 13 }}>
                  Step {step + 1} of {STEPS.length}
                </Muted>
                <Typography variant="h1" sx={{ letterSpacing: "-0.03em" }}>
                  {HEAD[step]![0]}
                </Typography>
                <Muted>{HEAD[step]![1]}</Muted>
              </Stack>
              <Stack gap={2.5} sx={{ px: 4, py: 3 }}>
                <StepBody step={step} f={f} />
              </Stack>
              <Stack direction="row" flexWrap="wrap" justifyContent="space-between" gap={1.5} sx={{ px: 4, py: 2, borderTop: `1px solid ${tokens.divider}`, bgcolor: tokens.surfaceMuted, borderRadius: "0 0 16px 16px" }}>
                <Button variant="text" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
                  Back
                </Button>
                <Stack direction="row" gap={1}>
                  <Button component={Link} href="/dashboard">
                    Finish later
                  </Button>
                  {step >= 2 && !last && <Button onClick={() => setStep((s) => s + 1)}>Skip</Button>}
                  <Button type="submit" variant="contained" color="primary" disabled={f.isSubmitting}>
                    {last ? "Go to dashboard" : "Continue"}
                  </Button>
                </Stack>
              </Stack>
            </Card>
          )}
        </Formik>
      </Box>
    </Box>
  );
}
