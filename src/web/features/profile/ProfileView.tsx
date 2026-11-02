"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { Form, Formik } from "formik";
import Link from "next/link";
import { useState } from "react";
import { FieldRow, FormikSelect, FormikTextField } from "@web/components/form";
import { InitialsAvatar, Muted, SectionCard, StatusTag, TwoLine } from "@web/components/ui";
import { v, Yup } from "@web/lib/validation";
import { tokens } from "@web/theme/tokens";

type Channel = "app" | "email" | "text";
const EVENTS: { key: string; title: string; sub: string; channels: Channel[] }[] = [
  { key: "payments", title: "Payment received or failed", sub: "Customer invoice payments", channels: ["app", "email", "text"] },
  { key: "decisions", title: "Proposal or change order decided", sub: "Accepted, declined, signed", channels: ["app", "email", "text"] },
  { key: "followups", title: "Lead follow-up due", sub: "Leads you own", channels: ["app", "email", "text"] },
  { key: "tasks", title: "Task assigned or blocked", sub: "Projects you're on", channels: ["app", "email", "text"] },
  { key: "integrations", title: "Integration errors", sub: "QuickBooks, Stripe, e-signature", channels: ["app", "email", "text"] },
  { key: "daily", title: "Daily summary", sub: "Weekdays at 7:00 AM", channels: ["email"] },
];

const PREFS: Record<string, Channel[]> = {
  payments: ["app", "email", "text"],
  decisions: ["app", "email"],
  followups: ["app"],
  tasks: ["app", "email"],
  integrations: ["app", "email"],
  daily: ["email"],
};

const passwordSchema = Yup.object({
  current: Yup.string().required("Enter your current password."),
  next: v.password().notOneOf([Yup.ref("current")], "Choose a password you haven't used here."),
  confirm: Yup.string()
    .oneOf([Yup.ref("next")], "Passwords don't match.")
    .required("Confirm your new password."),
});

export function ProfileView() {
  const [pwOpen, setPwOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  return (
    <>
      <Stack direction="row" gap={2} alignItems="center">
        <InitialsAvatar name="Dana Ruiz" size={56} />
        <Stack>
          <Typography variant="h1">Dana Ruiz</Typography>
          <Muted>Owner at Harbor &amp; Pine Remodeling</Muted>
        </Stack>
      </Stack>

      <Card>
        <Formik
          initialValues={{ name: "Dana Ruiz", phone: "(512) 555-0102", email: "dana@harborpine.com", timeZone: "company" }}
          validationSchema={Yup.object({ name: v.required("Full name"), phone: v.phone() })}
          onSubmit={(vals, { resetForm }) => {
            resetForm({ values: vals });
            setToast("Profile saved");
          }}
        >
          {({ dirty }) => (
            <Form noValidate>
              <Box sx={{ px: 2.5, py: 1.75, borderBottom: `1px solid ${tokens.divider}` }}>
                <Typography variant="h3">Personal details</Typography>
              </Box>
              <Box sx={{ p: 2.5 }}>
                <FieldRow min={240}>
                  <FormikTextField name="name" label="Full name" autoComplete="name" />
                  <FormikTextField name="phone" label="Mobile phone" type="tel" autoComplete="tel" />
                  <FormikTextField
                    name="email"
                    label="Email"
                    type="email"
                    disabled
                    hint="Changing your email requires re-verification."
                    slotProps={{ input: { endAdornment: <Box sx={{ pr: 1 }}><StatusTag tone="success">Verified</StatusTag></Box> } }}
                  />
                  <FormikSelect
                    name="timeZone"
                    label="Time zone"
                    options={[
                      { value: "company", label: "Use company time zone (Central)" },
                      { value: "America/New_York", label: "Eastern Time" },
                      { value: "America/Denver", label: "Mountain Time" },
                      { value: "America/Los_Angeles", label: "Pacific Time" },
                    ]}
                  />
                </FieldRow>
              </Box>
              <Stack direction="row" justifyContent="flex-end" sx={{ px: 2.5, py: 1.5, borderTop: `1px solid ${tokens.divider}`, bgcolor: tokens.surfaceMuted }}>
                <Button type="submit" variant="contained" color="primary" disabled={!dirty}>
                  Save
                </Button>
              </Stack>
            </Form>
          )}
        </Formik>
      </Card>

      <Card>
        <Formik initialValues={PREFS} onSubmit={(_, { resetForm }) => (resetForm({ values: _ }), setToast("Notification preferences saved"))}>
          {({ values, setFieldValue, dirty }) => (
            <Form>
              <Stack sx={{ px: 2.5, py: 1.75, borderBottom: `1px solid ${tokens.divider}` }}>
                <Typography variant="h3">Notification preferences</Typography>
                <Muted sx={{ fontSize: 12.5 }}>Choose how you hear about what matters to you.</Muted>
              </Stack>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Event</TableCell>
                      <TableCell align="center">In app</TableCell>
                      <TableCell align="center">Email</TableCell>
                      <TableCell align="center">Text</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {EVENTS.map((ev) => (
                      <TableRow key={ev.key}>
                        <TableCell>
                          <TwoLine title={ev.title} sub={ev.sub} />
                        </TableCell>
                        {(["app", "email", "text"] as Channel[]).map((c) => {
                          const on = values[ev.key]!.includes(c);
                          return (
                            <TableCell key={c} align="center">
                              {ev.channels.includes(c) ? (
                                <Checkbox
                                  checked={on}
                                  inputProps={{ "aria-label": `${ev.title} — ${c}` }}
                                  onChange={() => setFieldValue(ev.key, on ? values[ev.key]!.filter((x) => x !== c) : [...values[ev.key]!, c])}
                                />
                              ) : (
                                <Muted>—</Muted>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              {dirty && (
                <Stack direction="row" justifyContent="flex-end" sx={{ px: 2.5, py: 1.5, borderTop: `1px solid ${tokens.divider}`, bgcolor: tokens.surfaceMuted }}>
                  <Button type="submit" variant="contained" color="primary">
                    Save preferences
                  </Button>
                </Stack>
              )}
            </Form>
          )}
        </Formik>
      </Card>

      <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, alignItems: "start" }}>
        <SectionCard title="Sign-in & security" bodySx={{ p: 2.5, display: "flex", flexDirection: "column", gap: 1.5 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <TwoLine title="Password" sub="Last changed Aug 14" />
            <Button size="small" onClick={() => setPwOpen(true)}>
              Change
            </Button>
          </Stack>
          <Box sx={{ fontSize: 12, fontWeight: 500, color: "text.secondary", mt: 1 }}>Active sessions</Box>
          <Stack direction="row" justifyContent="space-between" sx={{ fontSize: 13.5 }}>
            <span>Chrome on macOS · Austin, TX</span>
            <StatusTag tone="success">This device</StatusTag>
          </Stack>
          <Stack direction="row" justifyContent="space-between" sx={{ fontSize: 13.5 }}>
            <span>Safari on iPhone · Austin, TX</span>
            <Muted>2 hours ago</Muted>
          </Stack>
          <Box>
            <Button size="small" onClick={() => setToast("Other sessions signed out")}>
              Sign out other sessions
            </Button>
          </Box>
        </SectionCard>
        <SectionCard title="Your companies" bodySx={{ p: 2.5, display: "flex", flexDirection: "column", gap: 1.5 }}>
          {[
            ["HP", "Harbor & Pine Remodeling", "Owner", true],
            ["RC", "Ruiz Cabinetry", "Admin", false],
          ].map(([b, n, r, cur]) => (
            <Stack key={n as string} direction="row" gap={1.5} alignItems="center">
              <Box sx={{ width: 36, height: 36, borderRadius: "9px", bgcolor: "#3A2A22", color: "#F5C9B1", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 600 }}>{b}</Box>
              <TwoLine title={n} sub={r} />
              {cur ? <StatusTag tone="success">Current</StatusTag> : <Button size="small">Switch</Button>}
            </Stack>
          ))}
          <Box>
            <Button variant="text" component={Link} href="/login">
              Sign out
            </Button>
          </Box>
        </SectionCard>
      </Box>

      <Dialog open={pwOpen} onClose={() => setPwOpen(false)} fullWidth maxWidth="xs">
        <Formik initialValues={{ current: "", next: "", confirm: "" }} validationSchema={passwordSchema} onSubmit={() => (setPwOpen(false), setToast("Password updated"))}>
          <Form noValidate>
            <DialogTitle>Change password</DialogTitle>
            <DialogContent>
              <Stack gap={2}>
                <FormikTextField name="current" label="Current password" type="password" autoComplete="current-password" />
                <FormikTextField name="next" label="New password" type="password" autoComplete="new-password" hint="At least 10 characters." />
                <FormikTextField name="confirm" label="Confirm new password" type="password" autoComplete="new-password" />
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setPwOpen(false)}>Cancel</Button>
              <Button type="submit" variant="contained" color="primary">
                Update password
              </Button>
            </DialogActions>
          </Form>
        </Formik>
      </Dialog>
      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)} message={toast} />
    </>
  );
}
