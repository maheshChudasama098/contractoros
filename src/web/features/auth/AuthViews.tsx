"use client";

import CheckOutlined from "@mui/icons-material/CheckOutlined";
import LockOutlined from "@mui/icons-material/LockOutlined";
import MailOutline from "@mui/icons-material/MailOutline";
import RadioButtonUncheckedOutlined from "@mui/icons-material/RadioButtonUncheckedOutlined";
import ScheduleOutlined from "@mui/icons-material/ScheduleOutlined";
import VerifiedUserOutlined from "@mui/icons-material/VerifiedUserOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Form, Formik, useFormikContext } from "formik";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { FormikCheckbox, FormikPasswordField, FormikTextField } from "@web/components/form";
import { IconTile, initials, Logo, Muted } from "@web/components/ui";
import { v, Yup } from "@web/lib/validation";
import { tokens } from "@web/theme/tokens";
import { ApiClientError } from "@web/lib/api-client";
import type { InvitationPreview } from "@shared/contracts/access";
import { authApi, authErrorMessage, RESET_EMAIL_KEY, RESET_TOKEN_KEY } from "./api";

const lg = { height: 44, fontSize: 14 } as const;
const inputLg = { "& .MuiOutlinedInput-input": { height: 44 } } as const;

/** Two-column auth layout: form on the left, product panel on the right (hidden below md). */
function AuthSplit({
  logoHref = "/login",
  footer,
  panel,
  children,
}: {
  logoHref?: string;
  footer?: ReactNode;
  panel?: PanelCopy;
  children: ReactNode;
}) {
  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexWrap: "wrap", bgcolor: tokens.bg }}>
      <Box
        component="main"
        sx={{ flex: "1 1 520px", display: "flex", flexDirection: "column", px: { xs: 2.5, md: 5 }, py: 4 }}
      >
        <Link href={logoHref}>
          <Logo size={32} />
        </Link>
        <Box sx={{ flex: 1, display: "grid", placeItems: "center", py: 6 }}>
          <Box sx={{ width: "100%", maxWidth: 380 }}>{children}</Box>
        </Box>
        {footer}
      </Box>
      <ProductPanel copy={panel} />
    </Box>
  );
}

type PanelCopy = { eyebrow: string; title: string; body: string; recoveryStep?: 0 | 1 | 2 };

const LOGIN_PANEL: PanelCopy = {
  eyebrow: "One Platform. Every Project.",
  title: "From first call to final walkthrough — in one place.",
  body: "Leads, estimates, contracts, change orders, invoices and homeowner updates for residential remodelers.",
};

const RECOVERY_PANELS = {
  forgot: {
    eyebrow: "Account recovery",
    title: "Locked out? Let's get you back on the job.",
    body: "Enter your work email and we'll send a one-time code. Your projects, estimates and invoices stay exactly where you left them.",
    recoveryStep: 0,
  },
  otp: {
    eyebrow: "Verify it's you",
    title: "One quick check to keep your workspace secure.",
    body: "We sent a 6-digit code to your inbox. It expires in 10 minutes and can only be used once.",
    recoveryStep: 1,
  },
  reset: {
    eyebrow: "Almost there",
    title: "Set a new password and you're back in.",
    body: "Pick something strong and unique. For your security, other devices will be signed out after the change.",
    recoveryStep: 2,
  },
} satisfies Record<string, PanelCopy>;

const RECOVERY_STEPS = ["Enter your email", "Verify the code", "Choose a new password"];

function RecoverySteps({ active }: { active: number }) {
  return (
    <Stack
      gap={1.5}
      sx={{ maxWidth: 460, bgcolor: "#1C1F24", border: "1px solid #2A2E35", borderRadius: "14px", p: 2.25 }}
    >
      <Stack direction="row" alignItems="center" gap={1} sx={{ fontSize: 13, color: "#9A9FA8" }}>
        <LockOutlined sx={{ fontSize: 16 }} /> Secure password reset
      </Stack>
      {RECOVERY_STEPS.map((label, i) => {
        const done = i < active;
        const current = i === active;
        return (
          <Stack key={label} direction="row" alignItems="center" gap={1.5}>
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                fontSize: 13,
                fontWeight: 600,
                bgcolor: done ? "#16A34A" : current ? "#DD7A51" : "#2A2E35",
                color: done || current ? "#fff" : "#9A9FA8",
              }}
            >
              {done ? <CheckOutlined sx={{ fontSize: 15 }} /> : i + 1}
            </Box>
            <Box sx={{ fontSize: 14, color: current ? "#fff" : "#9A9FA8", fontWeight: current ? 500 : 400 }}>
              {label}
            </Box>
          </Stack>
        );
      })}
    </Stack>
  );
}

function ProductPanel({ copy = LOGIN_PANEL }: { copy?: PanelCopy }) {
  return (
    <Box
      component="aside"
      aria-label="Product"
      sx={{
        flex: "1 1 520px",
        display: { xs: "none", md: "flex" },
        m: 1.5,
        borderRadius: "20px",
        bgcolor: "#121418",
        color: "#fff",
        p: 6,
        flexDirection: "column",
        justifyContent: "space-between",
        gap: 5,
      }}
    >
      <Stack gap={1.75} sx={{ maxWidth: 480 }}>
        <Box sx={{ fontSize: 13, color: "#F5C9B1", fontWeight: 500 }}>{copy.eyebrow}</Box>
        <Typography sx={{ fontSize: 40, lineHeight: 1.08, letterSpacing: "-0.035em", fontWeight: 600 }}>
          {copy.title}
        </Typography>
        <Typography sx={{ color: "#B4B8C0", fontSize: 15 }}>{copy.body}</Typography>
      </Stack>
      {copy.recoveryStep !== undefined && <RecoverySteps active={copy.recoveryStep} />}
    </Box>
  );
}

/** Account-access flows (forgot/OTP/reset/etc.) reuse the login split layout. */
function AuthCard({
  icon,
  iconTone = "brand",
  title,
  panel,
  children,
}: {
  icon?: ReactNode;
  iconTone?: "brand" | "info" | "neutral";
  title: string;
  panel?: PanelCopy;
  children: ReactNode;
}) {
  return (
    <AuthSplit panel={panel}>
      <Stack gap={2.25}>
        {icon && (
          <IconTile tone={iconTone} size={48}>
            {icon}
          </IconTile>
        )}
        <Typography variant="h1" sx={{ fontSize: 28, letterSpacing: "-0.03em" }}>
          {title}
        </Typography>
        {children}
      </Stack>
    </AuthSplit>
  );
}

function useCountdown(from: number) {
  const [left, setLeft] = useState(from);
  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  return [left, () => setLeft(from)] as const;
}
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

// ---------------------------------------------------------------- Login

export function LoginView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [magicSent, setMagicSent] = useState<string | null>(null);

  return (
    <AuthSplit
      logoHref="/"
      footer={
        <Muted sx={{ fontSize: 12 }}>
          Homeowner? Use the project link your contractor sent you — no account needed.
        </Muted>
      }
    >
      <Formik
        initialValues={{ email: "", password: "", remember: true }}
        validationSchema={Yup.object({ email: v.email(), password: Yup.string().required("Password is required.") })}
        onSubmit={async (vals, { setStatus }) => {
          setStatus(null);
          try {
            await authApi.login({ email: vals.email.trim(), password: vals.password, remember: vals.remember });
            const next = searchParams.get("next");
            router.replace(next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
            router.refresh();
          } catch (err) {
            setStatus(authErrorMessage(err));
          }
        }}
      >
        {({ isSubmitting, status, values, setFieldTouched, validateField }) => (
          <Form noValidate style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <Stack gap={0.75} sx={{ mb: 0.75 }}>
              <Typography variant="h1" sx={{ fontSize: 28, letterSpacing: "-0.03em" }}>
                Welcome back
              </Typography>
              <Muted>Sign in to your company workspace.</Muted>
            </Stack>
            {searchParams.get("reset") === "1" && !status && (
              <Alert severity="success">Password updated. Sign in with your new password.</Alert>
            )}
            {status && <Alert severity="error">{status}</Alert>}
            {magicSent && <Alert severity="success">Check {magicSent} for a sign-in link.</Alert>}
            <FormikTextField name="email" label="Work email" type="email" autoComplete="email" sx={inputLg} />
            <Stack gap={0.75}>
              <Stack direction="row" justifyContent="space-between" alignItems="baseline">
                <Box component="label" htmlFor="password" sx={{ fontSize: 13, fontWeight: 500, color: tokens.ink2 }}>
                  Password
                </Box>
                <Link href="/forgot-password" style={{ fontSize: 13, fontWeight: 500 }}>
                  Forgot password?
                </Link>
              </Stack>
              <FormikPasswordField name="password" autoComplete="current-password" sx={inputLg} />
            </Stack>
            <FormikCheckbox name="remember" label="Keep me signed in for 30 days" />
            <Button type="submit" variant="contained" color="primary" sx={lg} disabled={isSubmitting}>
              Sign in
            </Button>
            <Divider sx={{ fontSize: 12, color: "text.secondary" }}>OR</Divider>
            <Button
              sx={lg}
              onClick={async () => {
                setFieldTouched("email", true);
                const err = await validateField("email");
                if (!err && values.email) setMagicSent(values.email);
              }}
            >
              Email me a sign-in link
            </Button>
            <Muted sx={{ textAlign: "center", mt: 0.75 }}>
              New to ContractorOS?{" "}
              <Link href="/signup" style={{ fontWeight: 500 }}>
                Start a free trial
              </Link>
            </Muted>
          </Form>
        )}
      </Formik>
    </AuthSplit>
  );
}

// ---------------------------------------------------------------- Signup

const SIGNUP_PANEL: PanelCopy = {
  eyebrow: "Free 14-day trial",
  title: "Set up your company workspace in minutes.",
  body: "No credit card needed. Bring your team, send your first estimate today, and get paid faster.",
};

export function SignupView() {
  const router = useRouter();
  return (
    <AuthSplit logoHref="/" panel={SIGNUP_PANEL}>
      <Formik
        initialValues={{ name: "", company: "", email: "", password: "" }}
        validationSchema={Yup.object({
          name: v.required("Your name"),
          company: v.required("Company name"),
          email: v.email(),
          password: v.password(),
        })}
        onSubmit={async (vals, { setStatus, setErrors }) => {
          setStatus(null);
          try {
            await authApi.signup({
              ...vals,
              name: vals.name.trim(),
              company: vals.company.trim(),
              email: vals.email.trim().toLowerCase(),
            });
            router.replace("/onboarding");
            router.refresh();
          } catch (err) {
            const fields = err instanceof ApiClientError ? err.body.field_errors : undefined;
            if (fields) setErrors(Object.fromEntries(Object.entries(fields).map(([k, m]) => [k, m[0]!])));
            else setStatus(authErrorMessage(err));
          }
        }}
      >
        {({ isSubmitting, status }) => (
          <Form noValidate style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <Stack gap={0.75} sx={{ mb: 0.75 }}>
              <Typography variant="h1" sx={{ fontSize: 28, letterSpacing: "-0.03em" }}>
                Start your free trial
              </Typography>
              <Muted>Create your ContractorOS company account.</Muted>
            </Stack>
            {status && <Alert severity="error">{status}</Alert>}
            <FormikTextField name="name" label="Your name" autoComplete="name" sx={inputLg} />
            <FormikTextField name="company" label="Company name" autoComplete="organization" sx={inputLg} />
            <FormikTextField name="email" label="Work email" type="email" autoComplete="email" sx={inputLg} />
            <FormikPasswordField
              name="password"
              label="Password"
              autoComplete="new-password"
              hint="At least 10 characters."
              sx={inputLg}
            />
            <Button type="submit" variant="contained" color="primary" sx={lg} disabled={isSubmitting}>
              Create account
            </Button>
            <Muted sx={{ textAlign: "center", mt: 0.75 }}>
              Already have an account?{" "}
              <Link href="/login" style={{ fontWeight: 500 }}>
                Sign in
              </Link>
            </Muted>
          </Form>
        )}
      </Formik>
    </AuthSplit>
  );
}

// ------------------------------------------------- Forgot / reset password

export function ForgotPasswordView() {
  const router = useRouter();
  return (
    <AuthCard title="Reset your password" panel={RECOVERY_PANELS.forgot}>
      <Muted>Enter the email you sign in with and we&apos;ll send you a 6-digit verification code.</Muted>
      <Formik
        initialValues={{ email: "" }}
        validationSchema={Yup.object({ email: v.email() })}
        onSubmit={async (vals, { setStatus }) => {
          setStatus(null);
          const email = vals.email.trim().toLowerCase();
          try {
            await authApi.forgotPassword({ email });
            sessionStorage.setItem(RESET_EMAIL_KEY, email);
            sessionStorage.removeItem(RESET_TOKEN_KEY);
            router.push("/verify-otp");
          } catch (err) {
            setStatus(authErrorMessage(err));
          }
        }}
      >
        {({ isSubmitting, status }) => (
          <Form noValidate style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {status && <Alert severity="error">{status}</Alert>}
            <FormikTextField name="email" label="Work email" type="email" autoComplete="email" sx={inputLg} autoFocus />
            <Button type="submit" variant="contained" color="primary" sx={lg} disabled={isSubmitting}>
              Send code
            </Button>
            <Link href="/login" style={{ textAlign: "center", fontWeight: 500 }}>
              Back to sign in
            </Link>
          </Form>
        )}
      </Formik>
    </AuthCard>
  );
}

// ------------------------------------------------------------ Verify OTP

export function VerifyOtpView() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [left, restart] = useCountdown(60);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const e = sessionStorage.getItem(RESET_EMAIL_KEY);
    if (!e) router.replace("/forgot-password");
    else setEmail(e);
  }, [router]);

  if (!email) return null;

  return (
    <AuthCard icon={<MailOutline />} title="Enter verification code" panel={RECOVERY_PANELS.otp}>
      <Muted role="status">
        If an account exists for <strong style={{ color: tokens.ink }}>{email}</strong>, we sent a 6-digit code. It
        expires in 10 minutes.
      </Muted>
      <Formik
        initialValues={{ code: "" }}
        validationSchema={Yup.object({
          code: Yup.string()
            .matches(/^\d{6}$/, "Enter the 6-digit code.")
            .required("Enter the 6-digit code."),
        })}
        onSubmit={async (vals, { setStatus }) => {
          setStatus(null);
          setNotice(null);
          try {
            const { resetToken } = await authApi.verifyOtp({ email, code: vals.code });
            sessionStorage.setItem(RESET_TOKEN_KEY, resetToken);
            router.push("/reset-password");
          } catch (err) {
            setStatus(authErrorMessage(err));
          }
        }}
      >
        {({ isSubmitting, status, setFieldValue }) => (
          <Form noValidate style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {status && <Alert severity="error">{status}</Alert>}
            {notice && <Alert severity="success">{notice}</Alert>}
            <FormikTextField
              name="code"
              label="Verification code"
              autoComplete="one-time-code"
              autoFocus
              sx={{ ...inputLg, "& input": { letterSpacing: "0.4em", fontSize: 18, textAlign: "center" } }}
              inputProps={{ inputMode: "numeric", maxLength: 6 }}
              onChange={(e) => setFieldValue("code", e.target.value.replace(/\D/g, "").slice(0, 6))}
            />
            <Button type="submit" variant="contained" color="primary" sx={lg} disabled={isSubmitting}>
              Verify code
            </Button>
            <Button
              sx={lg}
              disabled={left > 0}
              onClick={async () => {
                try {
                  await authApi.forgotPassword({ email });
                  setNotice("A new code is on its way.");
                  restart();
                } catch (err) {
                  setNotice(null);
                  alertFallback(err);
                }
              }}
            >
              {left > 0 ? `Resend code in ${mmss(left)}` : "Resend code"}
            </Button>
            <Link href="/forgot-password" style={{ textAlign: "center", fontWeight: 500 }}>
              Use a different email
            </Link>
          </Form>
        )}
      </Formik>
    </AuthCard>
  );
}

const alertFallback = (err: unknown) => window.alert(authErrorMessage(err));

const COMMON = ["password123", "1234567890", "qwertyuiop", "contractor1"];

function PasswordRules() {
  const { values } = useFormikContext<{ password: string }>();
  const p = values.password;
  const long = p.length >= 10;
  const notCommon = !!p && !COMMON.includes(p.toLowerCase());
  const variety = /[A-Z]/.test(p) && /[a-z]/.test(p) && /\d/.test(p);
  const score = [p.length > 0, long, notCommon && long, variety && long].filter(Boolean).length;
  const Rule = ({ ok, children }: { ok: boolean; children: ReactNode }) => (
    <Stack direction="row" gap={1} alignItems="center" sx={{ fontSize: 13, color: ok ? tokens.ink : "text.secondary" }}>
      {ok ? (
        <CheckOutlined sx={{ fontSize: 14, color: "#166534" }} />
      ) : (
        <RadioButtonUncheckedOutlined sx={{ fontSize: 14, color: "#8A8F99" }} />
      )}
      {children}
    </Stack>
  );
  return (
    <Stack gap={0.75} id="pwr">
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 0.5 }}>
        {[0, 1, 2, 3].map((i) => (
          <Box key={i} sx={{ height: 4, borderRadius: 2, bgcolor: i < score ? tokens.brand : tokens.border }} />
        ))}
      </Box>
      <Rule ok={long}>At least 10 characters</Rule>
      <Rule ok={notCommon && long}>Not a commonly used password</Rule>
    </Stack>
  );
}

const newPassword = Yup.string()
  .min(10, "Use at least 10 characters.")
  .notOneOf(COMMON, "That password is too common.")
  .required("Choose a password.");

export function ResetPasswordView() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const t = sessionStorage.getItem(RESET_TOKEN_KEY);
    if (!t) router.replace("/forgot-password");
    else setToken(t);
  }, [router]);

  if (!token) return null;

  return (
    <AuthCard title="Choose a new password" panel={RECOVERY_PANELS.reset}>
      <Formik
        initialValues={{ password: "", confirm: "" }}
        validationSchema={Yup.object({
          password: newPassword,
          confirm: Yup.string()
            .oneOf([Yup.ref("password")], "Passwords don't match.")
            .required("Confirm your password."),
        })}
        onSubmit={async (vals, { setStatus, setFieldError }) => {
          setStatus(null);
          try {
            await authApi.resetPassword({ resetToken: token, password: vals.password });
            sessionStorage.removeItem(RESET_TOKEN_KEY);
            sessionStorage.removeItem(RESET_EMAIL_KEY);
            router.replace("/login?reset=1");
          } catch (err) {
            const fe = err instanceof ApiClientError ? err.body.field_errors?.password?.[0] : undefined;
            if (fe) setFieldError("password", fe);
            else setStatus(authErrorMessage(err));
          }
        }}
      >
        {({ isSubmitting, status }) => (
          <Form noValidate style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {status && (
              <Alert severity="error">
                {status} <Link href="/forgot-password">Start over</Link>
              </Alert>
            )}
            <FormikPasswordField
              name="password"
              label="New password"
              autoComplete="new-password"
              sx={inputLg}
              inputProps={{ "aria-describedby": "pwr" }}
            />
            <PasswordRules />
            <FormikPasswordField
              name="confirm"
              label="Confirm password"
              autoComplete="new-password"
              sx={inputLg}
            />
            <Button type="submit" variant="contained" color="primary" sx={lg} disabled={isSubmitting}>
              Update password
            </Button>
          </Form>
        )}
      </Formik>
    </AuthCard>
  );
}

// --------------------------------------------------------- Verify email

export function VerifyEmailView() {
  const [left, restart] = useCountdown(0);
  return (
    <AuthCard icon={<VerifiedUserOutlined />} iconTone="info" title="Confirm your email">
      <Muted>
        We sent a link to <strong style={{ color: tokens.ink }}>dana@harborpine.com</strong>. You&apos;ll need to verify
        before inviting your team or connecting payments.
      </Muted>
      <Button variant="contained" color="primary" sx={lg} href="mailto:">
        Open email app
      </Button>
      <Button sx={lg} disabled={left > 0} onClick={restart}>
        {left > 0 ? `Resend in ${mmss(left)}` : "Resend verification email"}
      </Button>
    </AuthCard>
  );
}

// ------------------------------------------------------ Accept invitation

const fmtInviteDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

export function AcceptInviteView({ token }: { token: string }) {
  const router = useRouter();
  const [invite, setInvite] = useState<InvitationPreview | null>(null);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    authApi
      .invitation(token)
      .then(setInvite)
      .catch(() => setInvalid(true));
  }, [token]);

  if (invalid)
    return (
      <AuthCard icon={<ScheduleOutlined />} iconTone="neutral" title="This invitation is no longer valid">
        <Muted>
          The link has expired, was replaced by a newer invitation, or was already used. Ask the person who invited you
          to send a new one. Invitations are valid for 7 days.
        </Muted>
        <Button component={Link} href="/login" sx={lg}>
          Back to sign in
        </Button>
      </AuthCard>
    );

  if (!invite)
    return (
      <AuthCard title="Loading invitation…">
        <Box sx={{ display: "grid", placeItems: "center", py: 3 }}>
          <CircularProgress size={28} />
        </Box>
      </AuthCard>
    );

  const existing = invite.account_exists;
  return (
    <AuthCard title={invite.role_name ? `Join as ${invite.role_name}` : "Join your team"}>
      <Stack direction="row" gap={1.5} alignItems="center">
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: "10px",
            bgcolor: "#3A2A22",
            color: "#F5C9B1",
            display: "grid",
            placeItems: "center",
            fontWeight: 600,
            flex: "none",
          }}
        >
          {initials(invite.organization_name)}
        </Box>
        <Stack>
          <Muted sx={{ fontSize: 13 }}>{invite.invited_by ? `${invite.invited_by} invited you to` : "You're invited to"}</Muted>
          <Box sx={{ fontWeight: 600 }}>{invite.organization_name}</Box>
        </Stack>
      </Stack>
      <Formik
        initialValues={{ email: invite.email, name: "", password: "" }}
        validationSchema={Yup.object(
          existing
            ? { password: Yup.string().required("Enter your password.") }
            : { name: v.required("Full name").min(2, "Enter your full name."), password: newPassword },
        )}
        onSubmit={async (vals, { setStatus, setErrors }) => {
          setStatus(null);
          try {
            const { redirect } = await authApi.acceptInvitation({
              token,
              password: vals.password,
              ...(!existing && { name: vals.name.trim() }),
            });
            router.replace(redirect);
            router.refresh();
          } catch (err) {
            const fields = err instanceof ApiClientError ? err.body.field_errors : undefined;
            if (fields) setErrors(Object.fromEntries(Object.entries(fields).map(([k, m]) => [k, m[0]!])));
            else setStatus(authErrorMessage(err));
          }
        }}
      >
        {({ isSubmitting, status }) => (
          <Form noValidate style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {status && <Alert severity="error">{status}</Alert>}
            <FormikTextField name="email" label="Email" disabled sx={inputLg} />
            {existing ? (
              <>
                <Muted sx={{ fontSize: 13 }}>You already have a ContractorOS account. Enter its password to join.</Muted>
                <FormikPasswordField name="password" label="Password" autoComplete="current-password" sx={inputLg} autoFocus />
              </>
            ) : (
              <>
                <FormikTextField name="name" label="Full name" autoComplete="name" sx={inputLg} autoFocus />
                <FormikPasswordField name="password" label="Create a password" autoComplete="new-password" sx={inputLg} />
                <PasswordRules />
              </>
            )}
            <Button type="submit" variant="contained" color="primary" sx={lg} disabled={isSubmitting}>
              Accept &amp; join
            </Button>
            <Muted sx={{ fontSize: 12, textAlign: "center" }}>Invitation expires {fmtInviteDate(invite.expires_at)}.</Muted>
          </Form>
        )}
      </Formik>
    </AuthCard>
  );
}

export function LockedNotice() {
  return (
    <Alert severity="warning" icon={<LockOutlined fontSize="small" />}>
      <strong>Too many sign-in attempts.</strong> Try again in 15 minutes or reset your password.
    </Alert>
  );
}
