"use client";

import AddOutlined from "@mui/icons-material/AddOutlined";
import CheckOutlined from "@mui/icons-material/CheckOutlined";
import DeleteOutline from "@mui/icons-material/DeleteOutline";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { FieldArray, Form, Formik, useFormikContext } from "formik";
import Link from "next/link";
import { useState } from "react";
import { FieldRow, FormikCheckbox, FormikSelect, FormikTextField } from "@web/components/form";
import { KeyValue, Muted, Num, PageHeader, SectionCard, money } from "@web/components/ui";
import { Yup } from "@web/lib/validation";
import { tokens } from "@web/theme/tokens";

type Line = { desc: string; sub?: string; qty: number | ""; price: number | "" };
type Values = {
  source: "milestone" | "custom";
  customer: string;
  project: string;
  type: string;
  issueDate: string;
  dueDate: string;
  lines: Line[];
  note: string;
  emailLink: boolean;
  showInPortal: boolean;
};

const MILESTONE: Line = { desc: "Cabinets installed", sub: "Milestone 3 · 25% of $86,400.00 base contract", qty: 1, price: 21600 };
const ISSUE = "2026-10-29";
const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const fmt = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

const schema = Yup.object({
  customer: Yup.string().required("Choose a customer."),
  project: Yup.string().required("Choose a project."),
  type: Yup.string().required(),
  issueDate: Yup.string().required("Issue date is required."),
  dueDate: Yup.string()
    .required("Choose a due date so the customer knows when payment is expected.")
    .test("after", "Due date can't be before the issue date.", function (v) {
      return !v || !this.parent.issueDate || v >= this.parent.issueDate;
    }),
  lines: Yup.array()
    .of(
      Yup.object({
        desc: Yup.string().trim().required("Description is required."),
        qty: Yup.number().typeError("Number").moreThan(0, "> 0").required("Required"),
        price: Yup.number().typeError("Number").moreThan(0, "> 0").required("Required"),
      }),
    )
    .min(1, "Add at least one line."),
  note: Yup.string().max(1000),
});

const total = (lines: Line[]) => lines.reduce((a, l) => a + Number(l.qty || 0) * Number(l.price || 0), 0);

function SourcePicker() {
  const { values, setFieldValue } = useFormikContext<Values>();
  return (
    <Stack gap={1}>
      {(["milestone", "custom"] as const).map((s) => (
        <Box
          key={s}
          component="label"
          sx={{ display: "flex", gap: 1.5, alignItems: "flex-start", p: 1.75, borderRadius: "10px", cursor: "pointer", border: `1px solid ${values.source === s ? tokens.brand : tokens.border}`, boxShadow: values.source === s ? `0 0 0 3px ${tokens.brandRing}` : undefined }}
        >
          <input
            type="radio"
            name="source"
            checked={values.source === s}
            onChange={() => {
              setFieldValue("source", s);
              setFieldValue("lines", s === "milestone" ? [MILESTONE] : [{ desc: "", qty: 1, price: "" }]);
            }}
            style={{ accentColor: tokens.brand, marginTop: 3 }}
          />
          <Stack>
            <Box sx={{ fontWeight: 500 }}>{s === "milestone" ? "Payment schedule milestone" : "Custom invoice"}</Box>
            <Muted sx={{ fontSize: 13 }}>
              {s === "milestone" ? (
                <>
                  Cabinets installed · 25% · <Num>$21,600.00</Num>
                </>
              ) : (
                "Add your own line items"
              )}
            </Muted>
          </Stack>
        </Box>
      ))}
    </Stack>
  );
}

function DueDate() {
  const { values, setFieldValue, setFieldTouched } = useFormikContext<Values>();
  const pick = (d: string) => {
    setFieldValue("dueDate", d);
    setFieldTouched("dueDate", true, false);
  };
  return (
    <Stack gap={1}>
      <FormikTextField name="dueDate" label={<>Due date <Box component="span" sx={{ color: tokens.danger }}>*</Box></>} type="date" />
      <Stack direction="row" gap={0.75}>
        {[
          ["Net 7", 7],
          ["Net 15", 15],
          ["On receipt", 0],
        ].map(([l, n]) => (
          <Button key={l} size="small" onClick={() => pick(addDays(values.issueDate || ISSUE, n as number))} sx={{ borderRadius: "14px", height: 28 }}>
            {l}
          </Button>
        ))}
      </Stack>
    </Stack>
  );
}

export function NewInvoiceView() {
  const [issued, setIssued] = useState<{ total: number; due: string } | null>(null);

  if (issued)
    return (
      <Card sx={{ maxWidth: 560, mx: "auto", mt: 4, p: 5, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 2 }}>
        <Box sx={{ width: 64, height: 64, borderRadius: "50%", bgcolor: "#E7F4EC", color: "#166534", display: "grid", placeItems: "center" }}>
          <CheckOutlined sx={{ fontSize: 32 }} />
        </Box>
        <Typography variant="h1" role="status">
          INV-3111 issued
        </Typography>
        <Muted>
          <Num>{money(issued.total, true)}</Num> is due {fmt(issued.due)}. Priya Shah has been emailed a secure payment link and the invoice appears in her portal.
        </Muted>
        <Stack direction="row" gap={1}>
          <Button component={Link} href="/invoices/inv-3111" variant="contained" color="primary">
            View invoice
          </Button>
          <Button component={Link} href="/invoices">
            Back to invoices
          </Button>
        </Stack>
      </Card>
    );

  return (
    <Formik<Values>
      initialValues={{ source: "milestone", customer: "Priya & Morgan Shah", project: "P-1042 · Shah Kitchen Remodel", type: "Progress", issueDate: ISSUE, dueDate: "", lines: [MILESTONE], note: "Thank you! Cabinets are set and leveled — countertop templating is next.", emailLink: true, showInPortal: true }}
      validationSchema={schema}
      onSubmit={(v) => setIssued({ total: total(v.lines), due: v.dueDate })}
    >
      {({ values, errors, submitCount, isValid }) => {
        const errCount = Object.keys(errors).length;
        return (
          <Form noValidate style={{ display: "contents" }}>
            <PageHeader title="New invoice" subtitle="Shah Kitchen Remodel · P-1042" />
            <Box sx={{ display: "grid", gap: 3, alignItems: "start", gridTemplateColumns: { xs: "1fr", lg: "minmax(0,1fr) 340px" } }}>
              <Stack gap={3} minWidth={0}>
                {submitCount > 0 && !isValid && (
                  <Alert severity="error" role="alert">
                    <strong>
                      {errCount} {errCount === 1 ? "thing" : "things"} to fix before issuing.
                    </strong>{" "}
                    {errors.dueDate ? "Choose a due date so the customer knows when payment is expected." : "Check the highlighted fields."}
                  </Alert>
                )}
                <SectionCard title="What are you billing?" bodySx={{ p: 2.5 }}>
                  <SourcePicker />
                </SectionCard>
                <SectionCard title="Details" bodySx={{ p: 2.5 }}>
                  <FieldRow min={220}>
                    <FormikSelect name="customer" label="Customer" options={["Priya & Morgan Shah", "Daniel Okafor", "Ellen Whitaker", "Rosa Delgado"]} />
                    <FormikSelect name="project" label="Project" options={["P-1042 · Shah Kitchen Remodel", "P-1039 · Okafor Primary Bath", "P-1045 · Whitaker Basement Finish"]} />
                    <FormikSelect name="type" label="Invoice type" options={["Progress", "Deposit", "Final", "Standard"]} />
                    <FormikTextField name="issueDate" label="Issue date" type="date" />
                    <DueDate />
                  </FieldRow>
                </SectionCard>
                <SectionCard title="Line items">
                  <FieldArray name="lines">
                    {(h) => (
                      <Stack gap={1.5} sx={{ p: 2.5 }}>
                        {values.lines.map((l, i) =>
                          values.source === "milestone" ? (
                            <Stack key={i} direction="row" justifyContent="space-between" gap={2}>
                              <Stack>
                                <Box sx={{ fontWeight: 500 }}>{l.desc}</Box>
                                <Muted sx={{ fontSize: 13 }}>{l.sub}</Muted>
                              </Stack>
                              <Num sx={{ fontWeight: 500 }}>{money(Number(l.price), true)}</Num>
                            </Stack>
                          ) : (
                            <Box key={i} sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", sm: "minmax(0,1fr) 80px 140px 40px" }, gap: 1, alignItems: "start" }}>
                              <Box sx={{ gridColumn: { xs: "1 / -1", sm: "auto" } }}>
                                <FormikTextField name={`lines.${i}.desc`} placeholder="Description" />
                              </Box>
                              <FormikTextField name={`lines.${i}.qty`} placeholder="Qty" inputMode="decimal" />
                              <FormikTextField name={`lines.${i}.price`} placeholder="Unit price" inputMode="decimal" />
                              <IconButton aria-label="Remove line" disabled={values.lines.length === 1} onClick={() => h.remove(i)}>
                                <DeleteOutline fontSize="small" />
                              </IconButton>
                            </Box>
                          ),
                        )}
                        {values.source === "custom" && (
                          <Box>
                            <Button size="small" variant="text" startIcon={<AddOutlined />} onClick={() => h.push({ desc: "", qty: 1, price: "" })}>
                              Add line
                            </Button>
                          </Box>
                        )}
                        <FormikTextField name="note" label="Note to customer" multiline minRows={2} />
                      </Stack>
                    )}
                  </FieldArray>
                </SectionCard>
              </Stack>
              <Card sx={{ position: { lg: "sticky" }, top: 24 }}>
                <Box sx={{ px: 2.5, py: 1.75, borderBottom: `1px solid ${tokens.divider}` }}>
                  <Typography variant="h3">Summary</Typography>
                </Box>
                <Stack gap={1.25} sx={{ p: 2.5 }}>
                  <KeyValue k="Subtotal" v={<Num>{money(total(values.lines), true)}</Num>} />
                  <KeyValue k="Sales tax · contract snapshot" v={<Num>$0.00</Num>} />
                  <Box sx={{ borderTop: `1px solid ${tokens.divider}`, pt: 1.25 }}>
                    <KeyValue strong k="Total due" v={<Num>{money(total(values.lines), true)}</Num>} />
                  </Box>
                  <FormikCheckbox name="emailLink" label="Email Priya a payment link" />
                  <FormikCheckbox name="showInPortal" label="Show in customer portal" />
                </Stack>
                <Stack gap={1} sx={{ p: 2.5, borderTop: `1px solid ${tokens.divider}`, bgcolor: tokens.surfaceMuted }}>
                  <Button type="submit" variant="contained" color="primary" fullWidth>
                    Issue invoice
                  </Button>
                  <Button fullWidth>Save as draft</Button>
                  <Muted sx={{ fontSize: 12 }}>Once issued, amounts are locked. Corrections use void &amp; reissue.</Muted>
                </Stack>
              </Card>
            </Box>
          </Form>
        );
      }}
    </Formik>
  );
}
