"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";
import Card from "@mui/material/Card";
import CircularProgress from "@mui/material/CircularProgress";
import FormHelperText from "@mui/material/FormHelperText";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Form, Formik } from "formik";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { FieldRow, FormikSelect, FormikTextField } from "@web/components/form";
import { Muted, PageHeader, SectionCard } from "@web/components/ui";
import { ApiClientError, api } from "@web/lib/api-client";
import { v, Yup } from "@web/lib/validation";
import { tokens } from "@web/theme/tokens";
import { authApi, authErrorMessage } from "@web/features/auth/api";
import { onboardingApi } from "@web/features/auth/onboarding-api";
import { PasswordSection, ProfileSection } from "@web/features/profile/ProfileView";
import type { MasterOption } from "@shared/contracts/masters";
import {
  LOGO_MAX_BYTES,
  LOGO_MIME_TYPES,
  type OrganizationProfile,
  type OrganizationProfileInput,
} from "@shared/contracts/onboarding";

type Section = "organization" | "profile" | "password" | "logout";

const GROUPS: { label: string; items: { key: Section; label: string }[] }[] = [
  { label: "Company", items: [{ key: "organization", label: "Organization" }] },
  {
    label: "Account",
    items: [
      { key: "profile", label: "Profile" },
      { key: "password", label: "Change password" },
      { key: "logout", label: "Log out" },
    ],
  },
];
const SECTIONS = GROUPS.flatMap((g) => g.items.map((i) => i.key));

export function SettingsView() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const raw = params.get("section") as Section | null;
  const section: Section = raw && SECTIONS.includes(raw) ? raw : "organization";
  const go = (s: Section) => router.replace(`${pathname}?section=${s}`, { scroll: false });

  return (
    <>
      <PageHeader title="Settings" subtitle="Company profile and your account." />
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0,1fr)", md: "220px minmax(0,1fr)" }, gap: 3, alignItems: "start" }}>
        <Stack component="nav" gap={2} sx={{ position: { md: "sticky" }, top: { md: 88 } }}>
          {GROUPS.map((g) => (
            <Stack key={g.label} gap={0.5}>
              <Typography sx={{ px: 1.5, fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "text.secondary" }}>
                {g.label}
              </Typography>
              {g.items.map((i) => {
                const active = i.key === section;
                return (
                  <ButtonBase
                    key={i.key}
                    onClick={() => go(i.key)}
                    aria-current={active ? "page" : undefined}
                    sx={{
                      justifyContent: "flex-start",
                      px: 1.5,
                      py: 1,
                      borderRadius: "8px",
                      fontSize: 14,
                      fontWeight: active ? 600 : 500,
                      color: i.key === "logout" ? "error.main" : "text.primary",
                      bgcolor: active ? "background.paper" : "transparent",
                      border: `1px solid ${active ? tokens.border : "transparent"}`,
                      boxShadow: active ? "0 1px 2px rgba(0,0,0,0.04)" : "none",
                      "&:hover": { bgcolor: active ? "background.paper" : tokens.surfaceMuted },
                    }}
                  >
                    {i.label}
                  </ButtonBase>
                );
              })}
            </Stack>
          ))}
        </Stack>

        <Stack gap={3} sx={{ minWidth: 0 }}>
          {section === "organization" && <OrganizationSection />}
          {section === "profile" && <ProfileSection />}
          {section === "password" && <PasswordSection />}
          {section === "logout" && <LogoutSection />}
        </Stack>
      </Box>
    </>
  );
}

// ------------------------------------------------------------ Organization

type Menus = { industry: MasterOption[]; company_size: MasterOption[]; time_zone: MasterOption[] };

const orgSchema = Yup.object({
  name: v.required("Company name"),
  phone: v.phone().required("Business phone is required."),
  email: Yup.string().trim().email("Enter a valid email."),
  website: Yup.string().trim().url("Enter a full link, like https://example.com"),
  industryId: Yup.string().required("Choose an industry."),
  companySize: Yup.string().required("Choose a company size."),
  addressLine1: v.required("Business address"),
  city: v.required("City"),
  state: v.required("State"),
  postalCode: v.required("ZIP code"),
  timezone: Yup.string().required("Choose a time zone."),
  googleReviewUrl: Yup.string().trim().url("Enter a full link, like https://g.page/r/…"),
});

const settingsApi = {
  get: () => api<OrganizationProfile>("/settings/organization"),
  save: (input: OrganizationProfileInput) =>
    api<OrganizationProfile>("/settings/organization", { method: "PUT", body: JSON.stringify(input) }),
  removeLogo: () => api<{ removed: true }>("/onboarding/logo", { method: "DELETE" }),
};

function OrganizationSection() {
  const [org, setOrg] = useState<OrganizationProfile | null>(null);
  const [menus, setMenus] = useState<Menus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      settingsApi.get(),
      onboardingApi.options("industry"),
      onboardingApi.options("company_size"),
      onboardingApi.options("time_zone"),
    ])
      .then(([o, industry, company_size, time_zone]) => {
        setOrg(o);
        setMenus({ industry, company_size, time_zone });
      })
      .catch((e) => setError(authErrorMessage(e)));
  }, []);

  if (!org || !menus) return error ? <Alert severity="error">{error}</Alert> : <CircularProgress sx={{ alignSelf: "center" }} />;

  const { hasLogo, slug: _slug, ...initial } = org;

  return (
    <>
      <Formik<typeof initial>
        initialValues={initial}
        enableReinitialize
        validationSchema={orgSchema}
        onSubmit={async (vals, { setStatus, setFieldError }) => {
          setStatus(null);
          try {
            const saved = await settingsApi.save(vals);
            setOrg(saved);
            setToast("Company details saved");
          } catch (e) {
            const fe = e instanceof ApiClientError ? e.body.field_errors : undefined;
            if (fe && Object.keys(fe).length) for (const [k, m] of Object.entries(fe)) setFieldError(k, m[0] ?? "");
            else setStatus(authErrorMessage(e));
          }
        }}
      >
        {({ dirty, isSubmitting, status, resetForm }) => (
          <Stack component={Form} noValidate gap={3}>
            {status && <Alert severity="error">{status}</Alert>}
            <Panel title="Organization profile" subtitle="Shown on estimates, invoices and the customer portal.">
              <LogoField name={org.name} initialHasLogo={hasLogo} />
              <FieldRow min={220}>
                <FormikTextField name="name" label="Legal / trading name" />
                <FormikTextField name="phone" label="Business phone" type="tel" />
              </FieldRow>
              <FieldRow min={220}>
                <FormikTextField name="email" label="Business email" type="email" placeholder="Optional" />
                <FormikTextField name="website" label="Website" placeholder="https://" />
                <FormikSelect name="timezone" label="Time zone" options={menus.time_zone} />
              </FieldRow>
              <FieldRow min={220}>
                <FormikSelect name="industryId" label="Industry" options={menus.industry} />
                <FormikSelect name="companySize" label="Company size" options={menus.company_size} />
                <FormikTextField name="googleReviewUrl" label="Google review link" placeholder="Optional" />
              </FieldRow>
            </Panel>

            <Panel title="Business address" subtitle="Printed on your documents.">
              <FieldRow min={260}>
                <FormikTextField name="addressLine1" label="Address" />
                <FormikTextField name="addressLine2" label="Suite / unit" placeholder="Optional" />
              </FieldRow>
              <FieldRow min={180}>
                <FormikTextField name="city" label="City" />
                <FormikTextField name="state" label="State" />
                <FormikTextField name="postalCode" label="ZIP code" />
              </FieldRow>
            </Panel>

            <Stack direction="row" justifyContent="flex-end" gap={1}>
              <Button onClick={() => resetForm()} disabled={!dirty || isSubmitting}>
                Discard
              </Button>
              <Button type="submit" variant="contained" color="primary" disabled={!dirty || isSubmitting}>
                Save changes
              </Button>
            </Stack>
          </Stack>
        )}
      </Formik>
      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)} message={toast} />
    </>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <SectionCard
      title={
        <Stack>
          <Typography variant="h3">{title}</Typography>
          <Muted sx={{ fontSize: 13 }}>{subtitle}</Muted>
        </Stack>
      }
      bodySx={{ p: 2.5, display: "flex", flexDirection: "column", gap: 2.5 }}
    >
      {children}
    </SectionCard>
  );
}

function LogoField({ name, initialHasLogo }: { name: string; initialHasLogo: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(initialHasLogo ? `/api/v1/onboarding/logo?t=${Date.now()}` : null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");

  useEffect(() => () => void (preview?.startsWith("blob:") && URL.revokeObjectURL(preview)), [preview]);

  const run = async (fn: () => Promise<void>) => {
    setError(null);
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof ApiClientError ? (e.body.field_errors?.logo?.[0] ?? e.body.message) : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  const pick = (file: File | undefined) => {
    if (!file) return;
    if (!(LOGO_MIME_TYPES as readonly string[]).includes(file.type)) return setError("Upload a PNG, JPG or WebP image.");
    if (file.size > LOGO_MAX_BYTES) return setError("Logo must be 2 MB or smaller.");
    void run(async () => {
      await onboardingApi.uploadLogo(file);
      setPreview(URL.createObjectURL(file));
    });
  };

  return (
    <Stack gap={0.75}>
      <Stack direction="row" alignItems="center" gap={2.5}>
        <Card
          variant="outlined"
          sx={{ width: 80, height: 80, borderRadius: "14px", display: "grid", placeItems: "center", overflow: "hidden", flex: "none", bgcolor: preview ? "background.paper" : "#3B2A20", border: preview ? undefined : "none" }}
        >
          {busy ? (
            <CircularProgress size={22} />
          ) : preview ? (
            // eslint-disable-next-line @next/next/no-img-element -- auth-protected API image, not a static asset
            <img src={preview} alt="Company logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          ) : (
            <Typography sx={{ color: "#F6C9A8", fontSize: 26, fontWeight: 700 }}>{initials || "—"}</Typography>
          )}
        </Card>
        <Stack gap={1}>
          <Typography sx={{ fontWeight: 600, fontSize: 14 }}>Company logo</Typography>
          <Stack direction="row" gap={1} alignItems="center">
            <Button variant="outlined" size="small" onClick={() => input.current?.click()} disabled={busy}>
              {preview ? "Replace" : "Upload"}
            </Button>
            {preview && (
              <Button size="small" color="inherit" disabled={busy} onClick={() => run(async () => {
                await settingsApi.removeLogo();
                setPreview(null);
              })}>
                Remove
              </Button>
            )}
          </Stack>
          <Muted sx={{ fontSize: 12 }}>PNG, JPG or WebP, up to 2 MB.</Muted>
        </Stack>
      </Stack>
      <input ref={input} type="file" accept={LOGO_MIME_TYPES.join(",")} hidden onChange={(e) => pick(e.target.files?.[0])} />
      {error && <FormHelperText error>{error}</FormHelperText>}
    </Stack>
  );
}

// ------------------------------------------------------------ Log out

function LogoutSection() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <SectionCard
      title={
        <Stack>
          <Typography variant="h3">Log out</Typography>
          <Muted sx={{ fontSize: 13 }}>Sign out of ContractorOS on this device.</Muted>
        </Stack>
      }
      bodySx={{ p: 2.5 }}
    >
      <Button
        variant="contained"
        color="error"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await authApi.logout().catch(() => undefined);
          router.replace("/login");
          router.refresh();
        }}
      >
        Log out
      </Button>
    </SectionCard>
  );
}
