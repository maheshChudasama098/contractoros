"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import LinearProgress from "@mui/material/LinearProgress";
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
import { Muted, Num, PageHeader, SectionCard, StatusTag } from "@web/components/ui";
import { v, Yup } from "@web/lib/validation";
import { tokens } from "@web/theme/tokens";

const NAV: [string, [string, string][]][] = [
  ["Company", [["Organization", "#org"], ["Branding & documents", "#"], ["Taxes", "#"], ["Lead sources & stages", "#"], ["Team & roles", "/team"]]],
  ["Workspace", [["Customer portal", "#"], ["Notifications", "/profile"], ["Integrations", "/integrations"]]],
  ["Account", [["Subscription & billing", "#billing"], ["Security & audit log", "#audit"]]],
];

export const TIME_ZONES = ["Eastern Time — America/New_York", "Central Time — America/Chicago", "Mountain Time — America/Denver", "Pacific Time — America/Los_Angeles"];

const orgSchema = Yup.object({
  name: v.required("Legal / trading name").max(160),
  slug: Yup.string()
    .trim()
    .required("Workspace URL is required.")
    .matches(/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/, "Use 3–40 lowercase letters, numbers or dashes."),
  phone: v.phone().required("Business phone is required."),
  email: v.email(),
  website: Yup.string().trim().matches(/^(https?:\/\/)?[\w-]+(\.[\w-]+)+(\/.*)?$/, "Enter a valid website."),
  timeZone: Yup.string().required(),
  address: v.required("Business address"),
});

export function SettingsView() {
  const [toast, setToast] = useState<string | null>(null);
  return (
    <>
      <PageHeader title="Settings" subtitle="Company profile, documents, billing and security for Harbor & Pine Remodeling." />
      <Box sx={{ display: "grid", gap: 3, alignItems: "start", gridTemplateColumns: { xs: "1fr", md: "220px minmax(0,1fr)" } }}>
        <Stack component="nav" aria-label="Settings sections" gap={0.25} sx={{ position: { md: "sticky" }, top: 24 }}>
          {NAV.map(([g, items]) => (
            <Stack key={g} gap={0.25} sx={{ mb: 1.5 }}>
              <Box sx={{ fontSize: 11, fontWeight: 500, letterSpacing: ".06em", textTransform: "uppercase", color: "#7D828B", px: 1.25, pb: 0.5 }}>{g}</Box>
              {items.map(([l, href]) => (
                <Box
                  key={l}
                  component={Link}
                  href={href}
                  aria-current={l === "Organization" ? "page" : undefined}
                  sx={{ display: "flex", alignItems: "center", height: 34, px: 1.25, borderRadius: "7px", fontSize: 13.5, fontWeight: 500, color: l === "Organization" ? tokens.ink : tokens.ink2, bgcolor: l === "Organization" ? "#fff" : "transparent", boxShadow: l === "Organization" ? "0 1px 2px rgba(16,24,40,.06)" : undefined, "&:hover": { bgcolor: l === "Organization" ? "#fff" : tokens.hover, color: tokens.ink } }}
                >
                  {l}
                </Box>
              ))}
            </Stack>
          ))}
        </Stack>
        <Stack gap={3} minWidth={0}>
          <Card id="org">
            <Formik
              initialValues={{ name: "Harbor & Pine Remodeling LLC", slug: "harbor-pine", phone: "(512) 555-0190", email: "office@harborpine.com", website: "harborpine.com", timeZone: TIME_ZONES[1]!, address: "2210 E Cesar Chavez St, Suite 4, Austin, TX 78702" }}
              validationSchema={orgSchema}
              onSubmit={(_, { resetForm, setSubmitting }) => {
                setSubmitting(false);
                resetForm({ values: _ });
                setToast("Organization profile saved");
              }}
            >
              {({ dirty, resetForm, isSubmitting }) => (
                <Form noValidate>
                  <Stack sx={{ px: 2.5, py: 1.75, borderBottom: `1px solid ${tokens.divider}` }}>
                    <Typography variant="h3">Organization profile</Typography>
                    <Muted sx={{ fontSize: 12.5 }}>Shown on estimates, invoices and the customer portal.</Muted>
                  </Stack>
                  <Stack gap={2.5} sx={{ p: 2.5 }}>
                    <Stack direction="row" gap={2} alignItems="center">
                      <Box sx={{ width: 64, height: 64, borderRadius: "14px", bgcolor: "#3A2A22", color: "#F5C9B1", display: "grid", placeItems: "center", fontWeight: 600, fontSize: 20 }}>HP</Box>
                      <Stack gap={1}>
                        <Box sx={{ fontWeight: 500 }}>Company logo</Box>
                        <Stack direction="row" gap={1}>
                          <Button size="small" component="label">
                            Upload
                            <input type="file" hidden accept="image/png,image/jpeg,image/svg+xml" onChange={() => setToast("Logo uploaded")} />
                          </Button>
                          <Button size="small" variant="text">
                            Remove
                          </Button>
                        </Stack>
                      </Stack>
                    </Stack>
                    <FieldRow min={240}>
                      <FormikTextField name="name" label="Legal / trading name" />
                      <FormikTextField name="slug" label="Workspace URL" slotProps={{ input: { startAdornment: <Box sx={{ color: "text.secondary", pl: 1.5, fontSize: 14, whiteSpace: "nowrap" }}>contractoros.app/</Box> } }} />
                      <FormikTextField name="phone" label="Business phone" type="tel" />
                      <FormikTextField name="email" label="Business email" type="email" />
                      <FormikTextField name="website" label="Website" />
                      <FormikSelect name="timeZone" label="Time zone" options={TIME_ZONES} />
                    </FieldRow>
                    <FormikTextField name="address" label="Business address" />
                  </Stack>
                  <Stack direction="row" justifyContent="flex-end" gap={1} sx={{ px: 2.5, py: 1.5, borderTop: `1px solid ${tokens.divider}`, bgcolor: tokens.surfaceMuted }}>
                    <Button variant="text" disabled={!dirty} onClick={() => resetForm()}>
                      Discard
                    </Button>
                    <Button type="submit" variant="contained" color="primary" disabled={!dirty || isSubmitting}>
                      Save changes
                    </Button>
                  </Stack>
                </Form>
              )}
            </Formik>
          </Card>

          <SectionCard
            title={
              <Stack id="billing">
                <Typography variant="h3">Subscription &amp; billing</Typography>
                <Muted sx={{ fontSize: 12.5 }}>Your ContractorOS plan. Billed separately from customer payments.</Muted>
              </Stack>
            }
            action={<Button size="small">Manage billing</Button>}
          >
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(200px,100%),1fr))" }}>
              <Stack gap={0.5} sx={{ p: 2.5, borderRight: `1px solid ${tokens.divider}` }}>
                <Muted sx={{ fontSize: 12.5 }}>Plan</Muted>
                <Stack direction="row" gap={1} alignItems="center">
                  <strong>Growth</strong>
                  <StatusTag tone="success">Active</StatusTag>
                </Stack>
                <Muted sx={{ fontSize: 12.5 }}>Renews Nov 14, 2026</Muted>
              </Stack>
              <Stack gap={0.75} sx={{ p: 2.5, borderRight: `1px solid ${tokens.divider}` }}>
                <Muted sx={{ fontSize: 12.5 }}>Seats</Muted>
                <Num sx={{ fontWeight: 500 }}>8 of 15</Num>
                <LinearProgress variant="determinate" value={(8 / 15) * 100} />
              </Stack>
              <Stack gap={0.5} sx={{ p: 2.5 }}>
                <Muted sx={{ fontSize: 12.5 }}>Payment method</Muted>
                <span>Visa ending 4421</span>
                <Muted sx={{ fontSize: 12.5 }}>Managed in Stripe billing portal</Muted>
              </Stack>
            </Box>
          </SectionCard>

          <SectionCard
            title={
              <Stack id="audit">
                <Typography variant="h3">Audit log</Typography>
                <Muted sx={{ fontSize: 12.5 }}>Append-only record of financial, permission and sharing changes.</Muted>
              </Stack>
            }
            action={<Button size="small">Export CSV</Button>}
          >
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>When</TableCell>
                    <TableCell>Actor</TableCell>
                    <TableCell>Action</TableCell>
                    <TableCell>Record</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {[
                    ["Today, 8:14 AM", <Stack key="s" direction="row" gap={1} alignItems="center">Stripe <StatusTag dot={false}>System</StatusTag></Stack>, "payment.succeeded", "INV-3108"],
                    ["Oct 27, 4:51 PM", "Marcus Bell", "change_order.issued", "CO-004"],
                    ["Oct 27, 11:03 AM", "Dana Ruiz", "member.role_changed · Kira Nguyen → Accountant", "Membership"],
                    ["Oct 26, 3:20 PM", "Marcus Bell", "portal_link.created", "P-1042"],
                  ].map(([w, a, act, rec], i) => (
                    <TableRow key={i}>
                      <TableCell sx={{ color: "text.secondary", whiteSpace: "nowrap" }}>{w}</TableCell>
                      <TableCell>{a}</TableCell>
                      <TableCell>
                        <Num sx={{ fontSize: 13 }}>{act}</Num>
                      </TableCell>
                      <TableCell>
                        <Num>{rec}</Num>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </SectionCard>
        </Stack>
      </Box>
      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)} message={toast} />
    </>
  );
}
