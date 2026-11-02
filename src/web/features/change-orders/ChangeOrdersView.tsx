"use client";

import AddOutlined from "@mui/icons-material/AddOutlined";
import DeleteOutline from "@mui/icons-material/DeleteOutline";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormLabel from "@mui/material/FormLabel";
import IconButton from "@mui/material/IconButton";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { FieldArray, Form, Formik, getIn } from "formik";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { ConfirmDialog } from "@web/components/dialogs";
import { FieldRow, FormikTextField } from "@web/components/form";
import { Muted, Num, SectionCard, StatusTag, money } from "@web/components/ui";
import { ProjectTabs } from "@web/features/projects/ProjectView";
import { Yup } from "@web/lib/validation";
import { tokens, type Tone } from "@web/theme/tokens";

type CO = { no: string; title: string; status: [string, Tone]; amount: string; days?: string };
const LIST: CO[] = [
  { no: "CO-005", title: "Credit: customer-supplied faucet", status: ["Draft", "neutral"], amount: "−$385.00" },
  { no: "CO-004", title: "Relocate range gas line", status: ["Awaiting customer", "warning"], amount: "+$1,840.00", days: "+2 days" },
  { no: "CO-003", title: "Add under-cabinet lighting", status: ["Approved", "success"], amount: "+$1,110.00" },
  { no: "CO-002", title: "Remove pantry wall", status: ["Declined", "danger"], amount: "+$2,900.00" },
  { no: "CO-001", title: "Upgrade to quartz backsplash", status: ["Approved", "success"], amount: "+$2,140.00" },
];

const LINES = [
  ["Licensed plumber — reroute & pressure test", "1", "lump sum", "$600.00", "$600.00"],
  ["Carpentry — open & patch subfloor", "6", "hour", "$95.00", "$570.00"],
  ["Black iron pipe, fittings & shutoff", "1", "lump sum", "$480.00", "$480.00"],
  ["City of Austin gas permit", "1", "each", "$190.00", "$190.00"],
];

type Line = { desc: string; qty: number | ""; unit: string; price: number | "" };
const newSchema = Yup.object({
  title: Yup.string().trim().required("Give the change a short title."),
  reason: Yup.string().trim().min(20, "Explain the scope and reason (20+ characters).").required("Explain the scope and reason."),
  days: Yup.number().typeError("Enter a number of days.").integer("Whole days only.").min(-60).max(120),
  customerNote: Yup.string().trim().required("Add a note the customer will see."),
  lines: Yup.array()
    .of(
      Yup.object({
        desc: Yup.string().trim().required("Required"),
        qty: Yup.number().typeError("Number").moreThan(0, "> 0").required("Required"),
        price: Yup.number().typeError("Number").required("Required"),
      }),
    )
    .min(1, "Add at least one line."),
});

function NewChangeOrderDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (title: string) => void }) {
  const blank: Line = { desc: "", qty: 1, unit: "each", price: "" };
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <Formik
        initialValues={{ title: "", reason: "", days: 0 as number | "", customerNote: "", lines: [blank] }}
        validationSchema={newSchema}
        onSubmit={(v) => {
          onCreated(v.title);
          onClose();
        }}
      >
        {({ values, errors, touched }) => {
          const total = values.lines.reduce((a, l) => a + Number(l.qty || 0) * Number(l.price || 0), 0);
          return (
            <Form noValidate>
              <DialogTitle>New change order · Shah Kitchen Remodel</DialogTitle>
              <DialogContent>
                <Stack gap={2}>
                  <FieldRow min={200}>
                    <FormikTextField name="title" label="Title" placeholder="Relocate range gas line" autoFocus />
                    <FormikTextField name="days" label="Schedule impact (days)" type="number" />
                  </FieldRow>
                  <FormikTextField name="reason" label="Scope & reason (internal + customer)" multiline minRows={3} />
                  <Stack gap={1}>
                    <FormLabel>Lines</FormLabel>
                    <FieldArray name="lines">
                      {(h) => (
                        <Stack gap={1}>
                          {values.lines.map((_, i) => (
                            <Box key={i} sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", sm: "minmax(0,3fr) 80px 110px 120px 40px" }, gap: 1, alignItems: "start" }}>
                              <Box sx={{ gridColumn: { xs: "1 / -1", sm: "auto" } }}>
                                <FormikTextField name={`lines.${i}.desc`} placeholder="Description" />
                              </Box>
                              <FormikTextField name={`lines.${i}.qty`} placeholder="Qty" inputMode="decimal" />
                              <FormikTextField name={`lines.${i}.unit`} placeholder="Unit" />
                              <FormikTextField name={`lines.${i}.price`} placeholder="Unit price" inputMode="decimal" />
                              <IconButton aria-label="Remove line" onClick={() => h.remove(i)} disabled={values.lines.length === 1}>
                                <DeleteOutline fontSize="small" />
                              </IconButton>
                            </Box>
                          ))}
                          {typeof errors.lines === "string" && touched.lines && <Box sx={{ color: tokens.danger, fontSize: 12 }}>{errors.lines}</Box>}
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Button size="small" variant="text" startIcon={<AddOutlined />} onClick={() => h.push(blank)}>
                              Add line
                            </Button>
                            <Box sx={{ fontWeight: 600 }}>
                              Price change <Num>{`${total >= 0 ? "+" : "−"}${money(Math.abs(total), true)}`}</Num>
                            </Box>
                          </Stack>
                        </Stack>
                      )}
                    </FieldArray>
                  </Stack>
                  <FormikTextField name="customerNote" label="Note shown to customer" multiline minRows={2} />
                  {getIn(errors, "lines") && Array.isArray(errors.lines) && <Muted sx={{ fontSize: 12.5 }}>Fix the highlighted lines to continue.</Muted>}
                </Stack>
              </DialogContent>
              <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button type="submit" variant="contained" color="primary">
                  Save draft
                </Button>
              </DialogActions>
            </Form>
          );
        }}
      </Formik>
    </Dialog>
  );
}

export function ChangeOrdersView() {
  const params = useSearchParams();
  const [sel, setSel] = useState("CO-004");
  const [newOpen, setNewOpen] = useState(params.get("new") === "1");
  const [voidOpen, setVoidOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const co = LIST.find((c) => c.no === sel)!;

  return (
    <>
      <Stack direction="row" flexWrap="wrap" justifyContent="space-between" alignItems="flex-start" gap={2}>
        <Stack gap={0.5}>
          <Stack direction="row" gap={1.25} alignItems="center">
            <Typography variant="h1">Shah Kitchen Remodel</Typography>
            <StatusTag tone="success">Active</StatusTag>
          </Stack>
          <Muted>
            <Num>P-1042</Num> · Only approved change orders change the contract value
          </Muted>
        </Stack>
        <Button variant="contained" color="primary" startIcon={<AddOutlined />} onClick={() => setNewOpen(true)}>
          New change order
        </Button>
      </Stack>
      <ProjectTabs id="p-1042" current="Change orders" />

      <Box sx={{ display: "grid", gap: 3, alignItems: "start", gridTemplateColumns: { xs: "1fr", md: "280px minmax(0,1fr)", xl: "280px minmax(0,1fr) 300px" } }}>
        <Card component="section" aria-label="Change order list">
          {LIST.map((c, i) => (
            <Box
              key={c.no}
              component="button"
              type="button"
              aria-current={c.no === sel ? "true" : undefined}
              onClick={() => setSel(c.no)}
              sx={{ display: "flex", flexDirection: "column", gap: 0.5, width: "100%", p: 2, textAlign: "left", font: "inherit", cursor: "pointer", border: 0, borderBottom: i < LIST.length - 1 ? `1px solid ${tokens.rowDivider}` : 0, borderLeft: `3px solid ${c.no === sel ? tokens.brand : "transparent"}`, bgcolor: c.no === sel ? tokens.surfaceMuted : "#fff", color: tokens.ink }}
            >
              <Stack direction="row" gap={1} alignItems="center">
                <Num sx={{ fontSize: 12, color: "text.secondary" }}>{c.no}</Num>
                <StatusTag tone={c.status[1]}>{c.status[0]}</StatusTag>
              </Stack>
              <Box sx={{ fontWeight: 500 }}>{c.title}</Box>
              <Num sx={{ fontSize: 13, color: c.status[0] === "Declined" ? "text.secondary" : tokens.ink }}>
                {c.amount}
                {c.days ? ` · ${c.days}` : ""}
              </Num>
            </Box>
          ))}
        </Card>

        <Card component="section" sx={{ p: 3, display: "flex", flexDirection: "column", gap: 2.5 }}>
          <Stack direction="row" flexWrap="wrap" justifyContent="space-between" gap={2}>
            <Stack gap={0.5}>
              <Num sx={{ fontSize: 12.5, color: "text.secondary" }}>{co.no} · Issued Oct 27 by Marcus Bell</Num>
              <Typography variant="h2">{co.title}</Typography>
              <Box>
                <StatusTag tone={co.status[1]}>{co.status[0] === "Awaiting customer" ? "Awaiting customer approval" : co.status[0]}</StatusTag>
              </Box>
            </Stack>
            <Stack direction="row" gap={1}>
              <Button size="small" onClick={() => setToast("Sent again to priya.shah@gmail.com")}>
                Resend to customer
              </Button>
              <Button size="small" onClick={() => setVoidOpen(true)}>
                Void…
              </Button>
            </Stack>
          </Stack>
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(150px,100%),1fr))", border: `1px solid ${tokens.border}`, borderRadius: "10px", overflow: "hidden" }}>
            {[
              ["Current contract", <Num key="a">$89,650.00</Num>],
              ["This change", <Num key="b" sx={{ color: tokens.brand }}>+$1,840.00</Num>],
              ["Revised if approved", <Num key="c" sx={{ fontWeight: 600 }}>$91,490.00</Num>],
              ["Schedule impact", <span key="d">+2 days <Muted>→ Dec 22</Muted></span>],
            ].map(([k, v], i) => (
              <Stack key={i} gap={0.5} sx={{ p: 1.75, borderRight: i < 3 ? `1px solid ${tokens.divider}` : 0 }}>
                <Muted sx={{ fontSize: 12 }}>{k}</Muted>
                <Box sx={{ fontSize: 15 }}>{v}</Box>
              </Stack>
            ))}
          </Box>
          <Stack gap={0.5}>
            <Muted sx={{ fontSize: 12.5 }}>Scope &amp; reason</Muted>
            <Typography>The existing gas line runs through the new island footprint. A licensed plumber will cap the current stub, run a new line to the range wall and pressure-test before cabinets are set. Includes city permit.</Typography>
          </Stack>
          <TableContainer sx={{ border: `1px solid ${tokens.border}`, borderRadius: "10px" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Line</TableCell>
                  <TableCell align="right">Qty</TableCell>
                  <TableCell>Unit</TableCell>
                  <TableCell align="right">Unit price</TableCell>
                  <TableCell align="right">Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {LINES.map((l) => (
                  <TableRow key={l[0]}>
                    <TableCell>{l[0]}</TableCell>
                    <TableCell align="right"><Num>{l[1]}</Num></TableCell>
                    <TableCell sx={{ color: "text.secondary" }}>{l[2]}</TableCell>
                    <TableCell align="right"><Num>{l[3]}</Num></TableCell>
                    <TableCell align="right"><Num>{l[4]}</Num></TableCell>
                  </TableRow>
                ))}
                <TableRow sx={{ "& td": { fontWeight: 600, bgcolor: tokens.surfaceMuted } }}>
                  <TableCell colSpan={4}>Price change</TableCell>
                  <TableCell align="right"><Num>+$1,840.00</Num></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
          <Box sx={{ p: 2, borderRadius: "10px", bgcolor: "#EAF0FD", color: "#1E3A8A" }}>
            <Box sx={{ fontWeight: 500, fontSize: 13, mb: 0.5 }}>Note shown to customer</Box>
            <Typography sx={{ fontSize: 13.5 }}>We found the gas line in the path of your new island. Moving it now keeps the cabinet install on track and meets code.</Typography>
          </Box>
        </Card>

        <Stack gap={3} sx={{ gridColumn: { md: "1 / -1", xl: "auto" } }}>
          <SectionCard title="Contract value" bodySx={{ p: 2.5, display: "flex", flexDirection: "column", gap: 1.25, fontSize: 13.5 }}>
            {[
              ["Original contract · EST-2052 v3", "$86,400.00", "mut"],
              ["CO-001 approved Sep 26", "+$2,140.00"],
              ["CO-003 approved Oct 14", "+$1,110.00"],
              ["Current contract value", "$89,650.00", "strong"],
              ["Pending · CO-004", "+$1,840.00", "warn"],
            ].map(([k, v, kind]) => (
              <Stack key={k} direction="row" justifyContent="space-between" gap={1} sx={{ fontWeight: kind === "strong" ? 600 : 400, borderTop: kind === "strong" ? `1px solid ${tokens.divider}` : 0, pt: kind === "strong" ? 1.25 : 0, color: kind === "warn" ? "#8A4B08" : kind === "mut" ? "text.secondary" : tokens.ink }}>
                <span>{k}</span>
                <Num>{v}</Num>
              </Stack>
            ))}
          </SectionCard>
          <SectionCard title="Approval trail" bodySx={{ p: 2.5, display: "flex", flexDirection: "column", gap: 1.25, fontSize: 13.5 }}>
            {[
              ["Viewed by Priya Shah in portal", "Oct 27, 9:14 PM"],
              ["Emailed to priya.shah@gmail.com", "Oct 27, 4:52 PM"],
              ["Issued · terms locked", "Oct 27, 4:51 PM"],
            ].map(([t, d]) => (
              <Stack key={t}>
                <span>{t}</span>
                <Muted sx={{ fontSize: 12.5 }}>{d}</Muted>
              </Stack>
            ))}
            <Muted sx={{ fontSize: 12.5 }}>Customer approval requires an email verification code and records name, email and time.</Muted>
          </SectionCard>
        </Stack>
      </Box>

      <NewChangeOrderDialog open={newOpen} onClose={() => setNewOpen(false)} onCreated={(t) => setToast(`Draft saved: ${t}`)} />
      <ConfirmDialog
        open={voidOpen}
        onClose={() => setVoidOpen(false)}
        onConfirm={() => setToast(`${co.no} voided`)}
        destructive
        title={`Void ${co.no}?`}
        description="The customer can no longer approve it and the contract value is unchanged. This can't be undone."
        initialValues={{ reason: "" }}
        schema={Yup.object({ reason: Yup.string().trim().required("A reason is required.") })}
        confirmLabel="Void change order"
      >
        <FormikTextField name="reason" label="Reason (required)" multiline minRows={2} />
      </ConfirmDialog>
      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)} message={toast} />
    </>
  );
}
