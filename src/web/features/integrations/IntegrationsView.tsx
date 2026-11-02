"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import FormHelperText from "@mui/material/FormHelperText";
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
import { useState } from "react";
import { ConfirmDialog } from "@web/components/dialogs";
import { DetailList, Muted, Num, PageHeader, SectionCard, StatusTag } from "@web/components/ui";
import { Yup } from "@web/lib/validation";
import { tokens, type Tone } from "@web/theme/tokens";

type Integration = { badge: string; badgeBg: string; name: string; sub: string; status: [string, Tone]; rows: [string, string][]; actions: string[] };
const INTEGRATIONS: Integration[] = [
  { badge: "QB", badgeBg: "#2CA01C", name: "QuickBooks Online", sub: "Accounting sync", status: ["1 error", "warning"], rows: [["Company", "Harbor & Pine Remodeling LLC"], ["Direction", "ContractorOS → QuickBooks"], ["Syncs", "Customers, invoices, payments"], ["Last sync", "12 minutes ago"], ["Token", "Refreshes automatically"]], actions: ["Sync now", "Disconnect"] },
  { badge: "S", badgeBg: "#635BFF", name: "Stripe Payments", sub: "Customer card & ACH payments", status: ["Connected", "success"], rows: [["Account", "Harbor & Pine · acct ••••7Kq2"], ["Payouts", "Enabled · daily to ••4410"], ["Methods", "Card, ACH bank transfer"], ["Webhooks", "Healthy · last event 8:14 AM"], ["Card data", "Stripe-hosted only"]], actions: ["Open Stripe dashboard"] },
  { badge: "✎", badgeBg: "#16181D", name: "[E-SIGN PROVIDER]", sub: "Contract & change-order signatures", status: ["Connected", "success"], rows: [["Envelopes", "1 pending · 14 completed"], ["Evidence", "Stored with each contract"], ["Webhooks", "Healthy"]], actions: ["Settings"] },
];

const LOG: [string, React.ReactNode, string, [string, Tone], number, string, boolean][] = [
  ["Today 9:02 AM", <>Payment · <Num>INV-3108</Num></>, "create", ["Failed", "danger"], 3, "Duplicate customer name — choose a mapping", false],
  ["Today 8:50 AM", "Customer · Rosa Delgado", "update", ["Succeeded", "success"], 1, "Phone number changed", true],
  ["Oct 23, 3:12 PM", <>Invoice · <Num>INV-3108</Num></>, "create", ["Succeeded", "success"], 1, "QuickBooks invoice 3108", true],
  ["Oct 14, 11:40 AM", <>Payment · <Num>INV-3095</Num></>, "create", ["Succeeded", "success"], 2, "Retried after rate limit", true],
];

const CHOICES = [
  { id: "1184", title: "Priya Shah · ID 1184", sub: "1418 Larkspur Ln, Austin · created Sep 4 by ContractorOS · 1 invoice" },
  { id: "0921", title: "Priya Shah · ID 0921", sub: "No address · created manually in QuickBooks 2024 · 0 invoices" },
];

export function IntegrationsView() {
  const [resolved, setResolved] = useState(false);
  const [failedOnly, setFailedOnly] = useState(false);
  const [disconnect, setDisconnect] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  return (
    <>
      <PageHeader title="Integrations" subtitle="Connections run in the background with retries. Errors stay here until resolved." />
      <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: "repeat(auto-fit, minmax(min(320px,100%),1fr))" }}>
        {INTEGRATIONS.map((ig) => (
          <Card key={ig.name} sx={{ display: "flex", flexDirection: "column" }}>
            <Stack direction="row" gap={1.5} alignItems="center" sx={{ p: 2.5, pb: 1 }}>
              <Box sx={{ width: 40, height: 40, borderRadius: "10px", bgcolor: ig.badgeBg, color: "#fff", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 14, flex: "none" }}>{ig.badge}</Box>
              <Stack flex={1} minWidth={0}>
                <Typography variant="h3">{ig.name}</Typography>
                <Muted sx={{ fontSize: 13 }}>{ig.sub}</Muted>
              </Stack>
              <StatusTag tone={ig.name.startsWith("Quick") && resolved ? "success" : ig.status[1]}>{ig.name.startsWith("Quick") && resolved ? "Connected" : ig.status[0]}</StatusTag>
            </Stack>
            <DetailList items={ig.rows.map(([k, v]) => ({ k, v }))} />
            <Stack direction="row" gap={1} sx={{ mt: "auto", px: 2.5, py: 1.5, borderTop: `1px solid ${tokens.divider}` }}>
              {ig.actions.map((a) => (
                <Button key={a} size="small" variant={a === "Disconnect" ? "text" : "outlined"} onClick={() => (a === "Disconnect" ? setDisconnect(true) : setToast(`${a}…`))}>
                  {a}
                </Button>
              ))}
            </Stack>
          </Card>
        ))}
      </Box>

      {!resolved && (
        <SectionCard
          title={
            <Stack>
              <Typography variant="h3">Resolve: customer mapping conflict</Typography>
              <Muted sx={{ fontSize: 12.5 }}>Payment $15,000.00 on INV-3108 · failed 3 times · last attempt 9:02 AM</Muted>
            </Stack>
          }
          action={<StatusTag tone="danger">Needs you</StatusTag>}
        >
          <Formik
            initialValues={{ qbc: "" }}
            validationSchema={Yup.object({ qbc: Yup.string().required("Choose which QuickBooks customer to use.") })}
            onSubmit={(v) => {
              setResolved(true);
              setToast(`Mapped to QuickBooks ID ${v.qbc} · retrying sync`);
            }}
          >
            {({ values, setFieldValue, errors, touched }) => (
              <Form noValidate>
                <Stack gap={2} sx={{ p: 2.5 }}>
                  <Typography>
                    QuickBooks has two customers that match <strong>Priya Shah</strong>. Pick the one ContractorOS should use from now on — we&apos;ll remember it and retry.
                  </Typography>
                  <Box component="fieldset" sx={{ border: 0, p: 0, m: 0, display: "flex", flexDirection: "column", gap: 1 }}>
                    <Box component="legend" sx={{ position: "absolute", width: "1px", height: "1px", overflow: "hidden", clip: "rect(0 0 0 0)" }}>
                      QuickBooks customer
                    </Box>
                    {CHOICES.map((c) => (
                      <Box
                        key={c.id}
                        component="label"
                        sx={{ display: "flex", gap: 1.5, alignItems: "flex-start", p: 1.75, borderRadius: "10px", cursor: "pointer", border: `1px solid ${values.qbc === c.id ? tokens.brand : tokens.border}`, boxShadow: values.qbc === c.id ? `0 0 0 3px ${tokens.brandRing}` : undefined }}
                      >
                        <input type="radio" name="qbc" value={c.id} checked={values.qbc === c.id} onChange={() => setFieldValue("qbc", c.id)} style={{ accentColor: tokens.brand, marginTop: 3 }} />
                        <Stack>
                          <Box sx={{ fontWeight: 500 }}>{c.title}</Box>
                          <Muted sx={{ fontSize: 13 }}>{c.sub}</Muted>
                        </Stack>
                      </Box>
                    ))}
                    {touched.qbc && errors.qbc && <FormHelperText error>{errors.qbc}</FormHelperText>}
                  </Box>
                  <Stack direction="row" gap={1}>
                    <Button type="submit" variant="contained" color="primary">
                      {values.qbc ? `Use ID ${values.qbc} & retry` : "Use selected & retry"}
                    </Button>
                    <Button variant="text" onClick={() => (setResolved(true), setToast("Record skipped"))}>
                      Skip this record
                    </Button>
                  </Stack>
                </Stack>
              </Form>
            )}
          </Formik>
        </SectionCard>
      )}

      <SectionCard
        title="Sync log"
        action={
          <Button size="small" aria-pressed={failedOnly} onClick={() => setFailedOnly((f) => !f)} sx={failedOnly ? { bgcolor: tokens.hover, borderColor: tokens.ink } : undefined}>
            Failed only
          </Button>
        }
      >
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Time</TableCell>
                <TableCell>Record</TableCell>
                <TableCell>Operation</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Attempts</TableCell>
                <TableCell>Detail</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {LOG.filter((l) => !failedOnly || l[3][0] === "Failed").map(([t, rec, op, st, att, det, mut], i) => (
                <TableRow key={i} hover>
                  <TableCell sx={{ color: "text.secondary", whiteSpace: "nowrap" }}>{t}</TableCell>
                  <TableCell>{rec}</TableCell>
                  <TableCell>
                    <Num>{op}</Num>
                  </TableCell>
                  <TableCell>
                    <StatusTag tone={st[1]}>{st[0]}</StatusTag>
                  </TableCell>
                  <TableCell>
                    <Num>{att}</Num>
                  </TableCell>
                  <TableCell sx={{ color: mut ? "text.secondary" : undefined }}>{det}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </SectionCard>

      <ConfirmDialog
        open={disconnect}
        onClose={() => setDisconnect(false)}
        onConfirm={() => setToast("QuickBooks disconnected")}
        destructive
        title="Disconnect QuickBooks?"
        description="New customers, invoices and payments stop syncing. Records already in QuickBooks are not changed."
        confirmLabel="Disconnect"
      />
      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)} message={toast} />
    </>
  );
}
