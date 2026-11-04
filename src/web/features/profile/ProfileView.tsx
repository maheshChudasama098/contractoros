"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Form, Formik } from "formik";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FieldRow, FormikPasswordField, FormikTextField } from "@web/components/form";
import { InitialsAvatar, Muted, PageHeader, SectionCard } from "@web/components/ui";
import { ApiClientError } from "@web/lib/api-client";
import { v, Yup } from "@web/lib/validation";
import { authApi, authErrorMessage } from "@web/features/auth/api";
import type { AuthUser } from "@shared/contracts/auth";

/** Maps server field errors onto Formik; returns a general message when there are none. */
function applyErrors(err: unknown, setFieldError: (f: string, m: string) => void): string | null {
  const fe = err instanceof ApiClientError ? err.body.field_errors : undefined;
  if (fe && Object.keys(fe).length) {
    for (const [k, m] of Object.entries(fe)) if (m[0]) setFieldError(k, m[0]);
    return null;
  }
  return authErrorMessage(err);
}

export function ProfileView() {
  const router = useRouter();
  const [me, setMe] = useState<AuthUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    authApi
      .me()
      .then(setMe)
      .catch((e) => setError(authErrorMessage(e)));
  }, []);

  if (!me) return error ? <Alert severity="error">{error}</Alert> : <CircularProgress sx={{ alignSelf: "center" }} />;

  return (
    <>
      <Stack direction="row" gap={2} alignItems="center">
        <InitialsAvatar name={me.name} size={56} />
        <Stack>
          <Typography variant="h1">{me.name}</Typography>
          <Muted>{me.email}</Muted>
        </Stack>
      </Stack>

      <SectionCard title="Personal details" bodySx={{ p: 2.5 }}>
        <Formik
          initialValues={{ name: me.name, phone: me.phone ?? "", email: me.email }}
          validationSchema={Yup.object({ name: v.required("Full name"), phone: v.phone() })}
          onSubmit={async (vals, { setStatus, setFieldError, resetForm }) => {
            setStatus(null);
            try {
              const updated = await authApi.updateProfile({ name: vals.name.trim(), phone: vals.phone.trim() });
              setMe(updated);
              resetForm({ values: { name: updated.name, phone: updated.phone ?? "", email: updated.email } });
              setToast("Profile saved");
              router.refresh(); // header shows the new name
            } catch (e) {
              setStatus(applyErrors(e, setFieldError));
            }
          }}
        >
          {({ dirty, isSubmitting, status }) => (
            <Stack component={Form} noValidate gap={2.5}>
              {status && <Alert severity="error">{status}</Alert>}
              <FieldRow>
                <FormikTextField name="name" label="Full name" autoComplete="name" />
                <FormikTextField name="phone" label="Phone" type="tel" autoComplete="tel" placeholder="Optional" />
              </FieldRow>
              <FormikTextField name="email" label="Email" disabled hint="Your sign-in email can't be changed here." />
              <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1.5}>
                <Link href="/change-password">Change password</Link>
                <Button type="submit" variant="contained" color="primary" disabled={!dirty || isSubmitting}>
                  Save changes
                </Button>
              </Stack>
            </Stack>
          )}
        </Formik>
      </SectionCard>
      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)} message={toast} />
    </>
  );
}

const passwordSchema = Yup.object({
  currentPassword: Yup.string().required("Enter your current password."),
  newPassword: v.password().notOneOf([Yup.ref("currentPassword")], "Choose a password you haven't used here."),
  confirm: Yup.string()
    .oneOf([Yup.ref("newPassword")], "Passwords don't match.")
    .required("Confirm your new password."),
});

export function ChangePasswordView() {
  const [done, setDone] = useState(false);

  return (
    <>
      <PageHeader title="Change password" subtitle="Other devices are signed out after you change it." />
      <Box sx={{ maxWidth: 560, width: "100%" }}>
        <SectionCard bodySx={{ p: 2.5 }}>
          <Formik
            initialValues={{ currentPassword: "", newPassword: "", confirm: "" }}
            validationSchema={passwordSchema}
            onSubmit={async (vals, { setStatus, setFieldError, resetForm }) => {
              setStatus(null);
              setDone(false);
              try {
                await authApi.changePassword({ currentPassword: vals.currentPassword, newPassword: vals.newPassword });
                resetForm();
                setDone(true);
              } catch (e) {
                setStatus(applyErrors(e, setFieldError));
              }
            }}
          >
            {({ isSubmitting, status }) => (
              <Stack component={Form} noValidate gap={2.5}>
                {done && <Alert severity="success">Password updated. Other devices have been signed out.</Alert>}
                {status && <Alert severity="error">{status}</Alert>}
                <FormikPasswordField name="currentPassword" label="Current password" autoComplete="current-password" />
                <FormikPasswordField
                  name="newPassword"
                  label="New password"
                  autoComplete="new-password"
                  hint="At least 10 characters."
                />
                <FormikPasswordField name="confirm" label="Confirm new password" autoComplete="new-password" />
                <Stack direction="row" justifyContent="flex-end" gap={1}>
                  <Button component={Link} href="/profile">
                    Cancel
                  </Button>
                  <Button type="submit" variant="contained" color="primary" disabled={isSubmitting}>
                    Update password
                  </Button>
                </Stack>
              </Stack>
            )}
          </Formik>
        </SectionCard>
      </Box>
    </>
  );
}
