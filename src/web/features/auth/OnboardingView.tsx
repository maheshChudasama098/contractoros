"use client";

import CheckOutlined from "@mui/icons-material/CheckOutlined";
import UploadOutlined from "@mui/icons-material/UploadOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CircularProgress from "@mui/material/CircularProgress";
import FormHelperText from "@mui/material/FormHelperText";
import FormLabel from "@mui/material/FormLabel";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Form, Formik, type FormikHelpers } from "formik";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { AnyObject, ObjectSchema } from "yup";
import { FieldRow, FormikSelect, FormikTextField } from "@web/components/form";
import { Logo, Muted } from "@web/components/ui";
import { ApiClientError } from "@web/lib/api-client";
import { v, Yup } from "@web/lib/validation";
import { tokens } from "@web/theme/tokens";
import type { MasterOption } from "@shared/contracts/masters";
import { LOGO_MAX_BYTES, LOGO_MIME_TYPES, type OnboardingState } from "@shared/contracts/onboarding";
import { authApi, authErrorMessage } from "./api";
import { onboardingApi } from "./onboarding-api";

type Menus = { industry: MasterOption[]; company_size: MasterOption[]; time_zone: MasterOption[] };

const STEPS = [
  { title: "Company profile", sub: "Name, industry, size", head: "Tell us about your company", body: "This appears on estimates, invoices and the customer portal." },
  { title: "Location & preferences", sub: "Address, time zone", head: "Where does your team work?", body: "Used on estimates and invoices, and to set due dates and schedule times." },
  { title: "Branding", sub: "Logo, Google reviews", head: "Make it yours", body: "Your logo shows on documents and the customer portal." },
];

const initialValues = {
  name: "",
  phone: "",
  industryId: "",
  companySize: "",
  addressLine1: "",
  city: "",
  state: "",
  postalCode: "",
  timezone: "America/Chicago",
  googleReviewUrl: "",
};
type Values = typeof initialValues;

const SCHEMAS: ObjectSchema<AnyObject>[] = [
  Yup.object({
    name: v.required("Company name"),
    phone: v.phone().required("Business phone is required."),
    industryId: Yup.string().required("Choose an industry."),
    companySize: Yup.string().required("Choose a company size."),
  }),
  Yup.object({
    addressLine1: v.required("Business address"),
    city: v.required("City"),
    state: v.required("State"),
    postalCode: v.required("ZIP code"),
    timezone: Yup.string().required(),
  }),
  Yup.object({ googleReviewUrl: Yup.string().trim().url("Enter a full link, like https://g.page/r/…") }),
];

const fromState = (s: OnboardingState): Values => ({
  ...initialValues,
  ...Object.fromEntries(Object.entries({ ...s.company, ...s.location }).filter(([, val]) => val != null)),
  googleReviewUrl: s.branding.googleReviewUrl ?? "",
});

function LogoUpload({ initialHasLogo }: { initialHasLogo: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(initialHasLogo ? "/api/v1/onboarding/logo" : null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => () => void (preview?.startsWith("blob:") && URL.revokeObjectURL(preview)), [preview]);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    if (!(LOGO_MIME_TYPES as readonly string[]).includes(file.type)) return setError("Upload a PNG, JPG or WebP image.");
    if (file.size > LOGO_MAX_BYTES) return setError("Logo must be 2 MB or smaller.");
    setBusy(true);
    try {
      await onboardingApi.uploadLogo(file);
      setPreview(URL.createObjectURL(file));
    } catch (err) {
      setError(err instanceof ApiClientError ? (err.body.field_errors?.logo?.[0] ?? err.body.message) : "Upload failed. Please try again.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <Stack gap={0.75}>
      <FormLabel htmlFor="logo">Company logo</FormLabel>
      <Stack direction="row" alignItems="center" gap={2}>
        <Box
          sx={{ width: 88, height: 88, borderRadius: "12px", border: `1px dashed ${tokens.borderStrong}`, bgcolor: tokens.surfaceMuted, display: "grid", placeItems: "center", overflow: "hidden", flex: "none" }}
        >
          {busy ? (
            <CircularProgress size={22} />
          ) : preview ? (
            // eslint-disable-next-line @next/next/no-img-element -- auth-protected API image, not a static asset
            <img src={preview} alt="Company logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          ) : (
            <UploadOutlined sx={{ color: "text.secondary" }} />
          )}
        </Box>
        <Stack gap={0.5}>
          <Box>
            <Button size="small" onClick={() => input.current?.click()} disabled={busy}>
              {preview ? "Replace logo" : "Upload logo"}
            </Button>
          </Box>
          <Muted sx={{ fontSize: 12 }}>PNG, JPG or WebP, up to 2 MB. Optional.</Muted>
        </Stack>
      </Stack>
      <input ref={input} id="logo" type="file" accept={LOGO_MIME_TYPES.join(",")} hidden onChange={(e) => pick(e.target.files?.[0])} />
      {error && <FormHelperText error>{error}</FormHelperText>}
    </Stack>
  );
}

function StepBody({ step, menus, state }: { step: number; menus: Menus; state: OnboardingState }) {
  switch (step) {
    case 0:
      return (
        <>
          <FormikTextField name="name" label="Company name" autoComplete="organization" />
          <FormikTextField name="phone" label="Business phone" type="tel" autoComplete="tel" />
          <FieldRow>
            <FormikSelect
              name="industryId"
              label="Industry"
              options={menus.industry}
              hint={menus.industry.length ? undefined : "No industries yet. Ask your administrator to add them."}
            />
            <FormikSelect name="companySize" label="Company size" options={menus.company_size} />
          </FieldRow>
        </>
      );
    case 1:
      return (
        <>
          <FormikTextField name="addressLine1" label="Business address" placeholder="2210 E Cesar Chavez St, Suite 4" autoComplete="street-address" />
          <FieldRow min={150}>
            <FormikTextField name="city" label="City" autoComplete="address-level2" />
            <FormikTextField name="state" label="State" autoComplete="address-level1" />
            <FormikTextField name="postalCode" label="ZIP code" autoComplete="postal-code" />
          </FieldRow>
          <FieldRow min={220}>
            <FormikSelect name="timezone" label="Time zone" options={menus.time_zone} hint="Dates, reminders and schedules use this zone." />
            <FormikSelect name="currency" label="Currency" options={["USD — US dollar"]} value="USD — US dollar" disabled hint="USD during the pilot." />
          </FieldRow>
        </>
      );
    default:
      return (
        <>
          <LogoUpload initialHasLogo={state.branding.hasLogo} />
          <FormikTextField
            name="googleReviewUrl"
            label="Google review link (optional)"
            type="url"
            placeholder="https://g.page/r/…/review"
            hint="We'll invite happy customers to leave a review here."
          />
        </>
      );
  }
}

export function OnboardingView() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [state, setState] = useState<OnboardingState | null>(null);
  const [menus, setMenus] = useState<Menus>({ industry: [], company_size: [], time_zone: [] });
  const [loadError, setLoadError] = useState<string | null>(null);
  const last = step === STEPS.length - 1;

  useEffect(() => {
    Promise.all([
      onboardingApi.state(),
      onboardingApi.options("industry"),
      onboardingApi.options("company_size"),
      onboardingApi.options("time_zone"),
    ])
      .then(([s, industry, company_size, time_zone]) => {
        setState(s);
        setMenus({ industry, company_size, time_zone });
      })
      .catch((err) => setLoadError(authErrorMessage(err)));
  }, []);

  const signOut = async () => {
    await authApi.logout();
    router.replace("/login");
    router.refresh();
  };

  const submit = async (vals: Values, { setErrors, setStatus, setTouched }: FormikHelpers<Values>) => {
    setStatus(null);
    try {
      if (step === 0) {
        await onboardingApi.saveCompany({ name: vals.name, phone: vals.phone, industryId: vals.industryId, companySize: vals.companySize });
      } else if (step === 1) {
        await onboardingApi.saveLocation({ addressLine1: vals.addressLine1, city: vals.city, state: vals.state, postalCode: vals.postalCode, timezone: vals.timezone });
      } else {
        await onboardingApi.complete({ googleReviewUrl: vals.googleReviewUrl });
        router.replace("/dashboard");
        router.refresh();
        return;
      }
      setTouched({});
      setStep((s) => s + 1);
    } catch (err) {
      const fields = err instanceof ApiClientError ? err.body.field_errors : undefined;
      const fieldMap = fields && Object.fromEntries(Object.entries(fields).filter(([k]) => !k.startsWith("_")).map(([k, m]) => [k, m[0]!]));
      if (fieldMap && Object.keys(fieldMap).length) setErrors(fieldMap);
      else setStatus(fields?._step?.[0] ?? authErrorMessage(err));
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: tokens.bg, display: "flex", flexDirection: "column" }}>
      <Stack component="header" direction="row" justifyContent="space-between" alignItems="center" gap={2} sx={{ px: { xs: 2, md: 4 }, py: 1.75, bgcolor: "#fff", borderBottom: `1px solid ${tokens.border}` }}>
        <Logo />
        <Muted sx={{ fontSize: 13 }}>
          {state?.email}
          {state?.email && " · "}
          <Box component="button" type="button" onClick={signOut} sx={{ all: "unset", cursor: "pointer", color: tokens.brand, fontWeight: 500 }}>
            Sign out
          </Box>
        </Muted>
      </Stack>
      <Box component="main" sx={{ width: "100%", maxWidth: 1080, mx: "auto", px: 3, pt: 6, pb: 9, display: "flex", flexWrap: "wrap", gap: 5, alignItems: "flex-start" }}>
        <Stack gap={2.5} sx={{ flex: "1 1 260px" }}>
          <Stack gap={0.75}>
            <Box sx={{ fontSize: 13, fontWeight: 500, color: tokens.brand }}>Get set up · about 2 minutes</Box>
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

        {!state ? (
          <Card sx={{ flex: "999 1 540px", minWidth: 0, borderRadius: "16px", p: 4, display: "grid", placeItems: "center", minHeight: 320 }}>
            {loadError ? <Alert severity="error">{loadError}</Alert> : <CircularProgress />}
          </Card>
        ) : (
          <Formik<Values> initialValues={fromState(state)} validationSchema={SCHEMAS[step]} onSubmit={submit}>
            {(f) => (
              <Card component={Form} noValidate sx={{ flex: "999 1 540px", minWidth: 0, borderRadius: "16px", display: "flex", flexDirection: "column" }}>
                <Stack gap={0.75} sx={{ px: 4, pt: 4, pb: 1 }}>
                  <Muted sx={{ fontSize: 13 }}>
                    Step {step + 1} of {STEPS.length}
                  </Muted>
                  <Typography variant="h1" sx={{ letterSpacing: "-0.03em" }}>
                    {STEPS[step]!.head}
                  </Typography>
                  <Muted>{STEPS[step]!.body}</Muted>
                </Stack>
                <Stack gap={2.5} sx={{ px: 4, py: 3 }}>
                  {f.status && <Alert severity="error">{f.status}</Alert>}
                  <StepBody step={step} menus={menus} state={state} />
                </Stack>
                <Stack direction="row" flexWrap="wrap" justifyContent="space-between" gap={1.5} sx={{ px: 4, py: 2, borderTop: `1px solid ${tokens.divider}`, bgcolor: tokens.surfaceMuted, borderRadius: "0 0 16px 16px" }}>
                  <Button variant="text" disabled={step === 0 || f.isSubmitting} onClick={() => setStep((s) => s - 1)}>
                    Back
                  </Button>
                  <Button type="submit" variant="contained" color="primary" disabled={f.isSubmitting}>
                    {last ? "Go to dashboard" : "Continue"}
                  </Button>
                </Stack>
              </Card>
            )}
          </Formik>
        )}
      </Box>
    </Box>
  );
}
