"use client";

import AddOutlined from "@mui/icons-material/AddOutlined";
import DeleteOutline from "@mui/icons-material/DeleteOutline";
import WarningAmberOutlined from "@mui/icons-material/WarningAmberOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import InputBase from "@mui/material/InputBase";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import { FieldArray, Form, Formik, getIn, useFormikContext } from "formik";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormikSelect, FormikTextField } from "@web/components/form";
import { InitialsAvatar, KeyValue, Muted, Num, SectionCard, SplitLayout, StatusTag, money } from "@web/components/ui";
import { Yup } from "@web/lib/validation";
import { tokens, type Tone } from "@web/theme/tokens";

type ItemType = "Labor" | "Material" | "Service" | "Allowance";
const TYPE_TONE: Record<ItemType, Tone> = { Labor: "info", Material: "brand", Service: "neutral", Allowance: "warning" };
const TAX_RATE = 0.0825;
const TARGET_MARGIN = 0.28;

type Item = { name: string; desc: string; type: ItemType; qty: number | ""; unit: string; price: number | ""; taxable: boolean; cost: number | "" };
type Group = { name: string; items: Item[] };
type Values = { groups: Group[]; scope: string; terms: string; validFor: string };

const item = (name: string, desc: string, type: ItemType, qty: number, unit: string, price: number, taxable: boolean, cost: number): Item => ({ name, desc, type, qty, unit, price, taxable, cost });

const SAMPLE: Values = {
  groups: [
    {
      name: "Demolition & framing",
      items: [
        item("Demolition & haul-off", "Remove existing partitions, dispose debris", "Labor", 1, "lump sum", 2400, false, 1450),
        item("Framing lumber & fasteners", "2×4 SPF, treated bottom plates", "Material", 620, "lin ft", 3.1, true, 2),
        item("Wall framing", "Exterior furring and partitions", "Labor", 48, "hour", 85, false, 55),
      ],
    },
    { name: "Electrical", items: [item("Electrical rough-in", "Licensed subcontractor, 14 circuits, permit", "Service", 1, "lump sum", 6850, false, 5480)] },
    {
      name: "Drywall",
      items: [
        item("1/2 in drywall board", "Moisture-resistant on exterior walls", "Material", 92, "sheet", 18.5, true, 12),
        item("Hang, tape & finish", "Level 4 finish", "Labor", 2350, "sq ft", 2.4, false, 1.6),
      ],
    },
    {
      name: "Flooring",
      items: [
        item("LVP flooring material", "Allowance — customer selection", "Allowance", 1, "each", 4500, true, 4500),
        item("Flooring install", "Includes underlayment and transitions", "Labor", 980, "sq ft", 3.25, false, 2.1),
      ],
    },
  ],
  scope:
    "Finish approx. 980 sq ft of unfinished basement into a family room and flex space. Includes framing of exterior and partition walls, electrical rough-in by licensed subcontractor, drywall to Level 4 finish, and luxury vinyl plank flooring. Excludes plumbing, HVAC changes and paint.",
  terms: "Standard residential · v4",
  validFor: "30 days",
};

const EMPTY: Values = { groups: [{ name: "General", items: [item("", "", "Labor", 1, "each", 0, false, 0)] }], scope: "", terms: "Standard residential · v4", validFor: "30 days" };

const num = (n: number | "") => (n === "" ? 0 : Number(n));

function totals(groups: Group[]) {
  let subtotal = 0,
    taxable = 0,
    cost = 0;
  for (const g of groups)
    for (const i of g.items) {
      const line = num(i.qty) * num(i.price);
      subtotal += line;
      if (i.taxable) taxable += line;
      cost += num(i.qty) * num(i.cost);
    }
  const tax = Math.round(taxable * TAX_RATE * 100) / 100;
  const margin = subtotal - cost;
  return { subtotal, taxable, tax, total: subtotal + tax, cost, margin, marginPct: subtotal ? margin / subtotal : 0 };
}

const schema = Yup.object({
  groups: Yup.array()
    .of(
      Yup.object({
        name: Yup.string().trim().required("Section name is required."),
        items: Yup.array()
          .of(
            Yup.object({
              name: Yup.string().trim().required("Item name is required."),
              qty: Yup.number().typeError("Number").moreThan(0, "> 0").required("Required"),
              price: Yup.number().typeError("Number").min(0, "≥ 0").required("Required"),
              cost: Yup.number().typeError("Number").min(0, "≥ 0"),
            }),
          )
          .min(1, "Add at least one line item."),
      }),
    )
    .min(1),
  scope: Yup.string().trim().required("Describe the scope of work — it appears on the PDF."),
});

const cellInput = { font: "inherit", fontSize: 13.5, width: "100%", "& input": { p: "6px 8px", borderRadius: "6px", border: "1px solid transparent" }, "& input:hover": { borderColor: tokens.borderStrong }, "& input:focus": { borderColor: tokens.brand, bgcolor: "#fff" } };

function CellField({ name, numeric, placeholder, align }: { name: string; numeric?: boolean; placeholder?: string; align?: "right" }) {
  const { values, errors, touched, handleChange, handleBlur } = useFormikContext<Values>();
  const err = getIn(touched, name) && getIn(errors, name);
  return (
    <InputBase
      name={name}
      value={getIn(values, name)}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      inputProps={{ inputMode: numeric ? "decimal" : undefined, "aria-invalid": !!err, title: err || undefined, style: { textAlign: align } }}
      sx={{ ...cellInput, ...(numeric && { typography: "num" }), "& input": { ...cellInput["& input"], ...(err ? { borderColor: tokens.danger, bgcolor: tokens.dangerSoft } : {}) } }}
    />
  );
}

function LineItems({ showCost }: { showCost: boolean }) {
  const { values, setFieldValue, errors } = useFormikContext<Values>();
  const cols = showCost ? "minmax(220px,3fr) 112px 80px 90px 110px 56px 120px 100px 110px 40px" : "minmax(220px,3fr) 112px 80px 90px 110px 56px 120px 40px";
  const head = ["Item", "Type", "Qty", "Unit", "Unit price", "Tax", "Line total", ...(showCost ? ["Unit cost", "Line cost"] : []), ""];

  return (
    <FieldArray name="groups">
      {(groupsHelpers) => (
        <>
          <Box sx={{ overflowX: "auto" }}>
            <Box sx={{ minWidth: showCost ? 1080 : 880 }}>
              <Box sx={{ display: "grid", gridTemplateColumns: cols, gap: 1, px: 2.5, py: 1.25, bgcolor: tokens.surfaceMuted, borderBottom: `1px solid ${tokens.divider}`, fontSize: 12, fontWeight: 500, color: "text.secondary" }}>
                {head.map((h, i) => (
                  <Box key={i} sx={{ textAlign: i >= 2 && i !== 3 && i !== 5 ? "right" : undefined, color: i >= 7 && showCost && h ? tokens.brand : undefined }}>
                    {h}
                  </Box>
                ))}
              </Box>
              {values.groups.map((g, gi) => {
                const sub = g.items.reduce((a, i) => a + num(i.qty) * num(i.price), 0);
                return (
                  <FieldArray key={gi} name={`groups.${gi}.items`}>
                    {(itemsHelpers) => (
                      <Box>
                        <Stack direction="row" alignItems="center" gap={1} sx={{ px: 2.5, py: 1, bgcolor: "#F6F6F3", borderBottom: `1px solid ${tokens.rowDivider}` }}>
                          <Box sx={{ flex: 1, fontWeight: 600 }}>
                            <CellField name={`groups.${gi}.name`} placeholder="Section name" />
                          </Box>
                          <Num sx={{ color: "text.secondary", fontSize: 13 }}>{money(sub, true)}</Num>
                          <Button size="small" variant="text" startIcon={<AddOutlined />} onClick={() => itemsHelpers.push(item("", "", "Labor", 1, "each", 0, false, 0))}>
                            Item
                          </Button>
                        </Stack>
                        {g.items.map((it, ii) => {
                          const p = `groups.${gi}.items.${ii}`;
                          return (
                            <Box key={ii} sx={{ display: "grid", gridTemplateColumns: cols, gap: 1, alignItems: "center", px: 2.5, py: 0.75, borderBottom: `1px solid ${tokens.rowDivider}` }}>
                              <Box>
                                <CellField name={`${p}.name`} placeholder="Item name" />
                                <Box sx={{ color: "text.secondary", "& input": { fontSize: 12.5 } }}>
                                  <CellField name={`${p}.desc`} placeholder="Description" />
                                </Box>
                              </Box>
                              <Select
                                size="small"
                                variant="standard"
                                disableUnderline
                                value={it.type}
                                onChange={(e) => setFieldValue(`${p}.type`, e.target.value)}
                                renderValue={(v) => <StatusTag tone={TYPE_TONE[v as ItemType]}>{v}</StatusTag>}
                                inputProps={{ "aria-label": "Type" }}
                              >
                                {(Object.keys(TYPE_TONE) as ItemType[]).map((t) => (
                                  <MenuItem key={t} value={t}>
                                    {t}
                                  </MenuItem>
                                ))}
                              </Select>
                              <CellField name={`${p}.qty`} numeric align="right" />
                              <CellField name={`${p}.unit`} />
                              <CellField name={`${p}.price`} numeric align="right" />
                              <Box sx={{ textAlign: "center" }}>
                                <input type="checkbox" aria-label="Taxable" checked={it.taxable} onChange={(e) => setFieldValue(`${p}.taxable`, e.target.checked)} style={{ accentColor: tokens.brand, width: 16, height: 16 }} />
                              </Box>
                              <Num sx={{ textAlign: "right", fontWeight: 500 }}>{money(num(it.qty) * num(it.price), true)}</Num>
                              {showCost && (
                                <>
                                  <CellField name={`${p}.cost`} numeric align="right" />
                                  <Num sx={{ textAlign: "right", color: "text.secondary" }}>{money(num(it.qty) * num(it.cost), true)}</Num>
                                </>
                              )}
                              <IconButton size="small" aria-label="Remove line item" onClick={() => itemsHelpers.remove(ii)}>
                                <DeleteOutline fontSize="small" />
                              </IconButton>
                            </Box>
                          );
                        })}
                        {typeof getIn(errors, `groups.${gi}.items`) === "string" && (
                          <Box sx={{ px: 2.5, py: 1, color: tokens.danger, fontSize: 12.5 }}>{getIn(errors, `groups.${gi}.items`)}</Box>
                        )}
                      </Box>
                    )}
                  </FieldArray>
                );
              })}
            </Box>
          </Box>
          <Stack direction="row" gap={1} sx={{ p: 1.5 }}>
            <Button variant="text" startIcon={<AddOutlined />} onClick={() => groupsHelpers.push({ name: "", items: [item("", "", "Labor", 1, "each", 0, false, 0)] })}>
              Add section
            </Button>
          </Stack>
        </>
      )}
    </FieldArray>
  );
}

function Summary({ showCost }: { showCost: boolean }) {
  const { values } = useFormikContext<Values>();
  const t = totals(values.groups);
  const below = t.marginPct < TARGET_MARGIN;
  return (
    <SectionCard title="Summary" action={<Muted sx={{ fontSize: 12.5 }}>Preview · server recalculates</Muted>} bodySx={{ p: 2.5, display: "flex", flexDirection: "column", gap: 1.25 }}>
      <KeyValue k="Subtotal" v={<Num>{money(t.subtotal, true)}</Num>} />
      <KeyValue k="Discount" v={<Button size="small" variant="text">Add</Button>} />
      <KeyValue
        k={
          <>
            Sales tax · Round Rock, TX 8.25%
            <Box component="span" sx={{ display: "block", fontSize: 12 }}>
              on {money(t.taxable, true)} taxable
            </Box>
          </>
        }
        v={<Num>{money(t.tax, true)}</Num>}
      />
      <Box sx={{ borderTop: `1px solid ${tokens.divider}`, pt: 1.25 }}>
        <KeyValue strong k="Customer total" v={<Num>{money(t.total, true)}</Num>} />
      </Box>
      {showCost && (
        <Stack gap={1} sx={{ mt: 1, p: 1.75, borderRadius: "10px", bgcolor: tokens.brandSoft }}>
          <Box sx={{ fontSize: 11, fontWeight: 500, letterSpacing: ".06em", textTransform: "uppercase", color: "#8A3410" }}>Internal · never shown to customer</Box>
          <KeyValue k="Internal cost" v={<Num>{money(t.cost, true)}</Num>} />
          <KeyValue k="Margin" v={<Num sx={{ color: below ? tokens.danger : "#166534", fontWeight: 500 }}>{`${money(t.margin, true)} · ${(t.marginPct * 100).toFixed(1)}%`}</Num>} />
          <Box sx={{ position: "relative", height: 6, borderRadius: 3, bgcolor: "#fff" }}>
            <Box sx={{ width: `${Math.min(100, (t.marginPct / 0.4) * 100)}%`, height: "100%", borderRadius: 3, bgcolor: below ? tokens.danger : "#166534" }} />
            <Box sx={{ position: "absolute", left: `${(TARGET_MARGIN / 0.4) * 100}%`, top: -3, width: 2, height: 12, bgcolor: tokens.ink }} />
          </Box>
          <Muted sx={{ fontSize: 12 }}>Company target {TARGET_MARGIN * 100}%</Muted>
        </Stack>
      )}
    </SectionCard>
  );
}

function IssueDialog({ open, onClose, onIssue }: { open: boolean; onClose: () => void; onIssue: () => void }) {
  const { values } = useFormikContext<Values>();
  const t = totals(values.groups);
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Issue EST-2081 as version 1?</DialogTitle>
      <DialogContent>
        <Stack gap={2}>
          <Muted sx={{ fontSize: 13.5 }}>Line items, prices, tax and terms are locked into a permanent snapshot. Any later change creates version 2.</Muted>
          <Stack gap={1} sx={{ p: 1.5, borderRadius: "10px", border: `1px solid ${tokens.border}` }}>
            <KeyValue k="Customer total" v={<Num>{money(t.total, true)}</Num>} />
            <KeyValue k="Valid until" v="Nov 28, 2026" />
          </Stack>
          {t.marginPct < TARGET_MARGIN && (
            <Alert severity="warning" icon={<WarningAmberOutlined fontSize="small" />}>
              Margin {(t.marginPct * 100).toFixed(1)}% is below your {TARGET_MARGIN * 100}% target.
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Keep editing</Button>
        <Button variant="contained" color="primary" onClick={onIssue}>
          Issue version 1
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function EstimateEditorView({ id }: { id: string }) {
  const router = useRouter();
  const isNew = id === "new";
  const [showCost, setShowCost] = useState(true);
  const [issueOpen, setIssueOpen] = useState(false);

  return (
    <Formik<Values> initialValues={isNew ? EMPTY : SAMPLE} validationSchema={schema} onSubmit={() => setIssueOpen(true)}>
      {({ submitForm, dirty }) => (
        <Form noValidate style={{ display: "contents" }}>
          <Stack direction="row" flexWrap="wrap" justifyContent="space-between" alignItems="flex-start" gap={2}>
            <Stack gap={0.5}>
              <Stack direction="row" gap={1.5} alignItems="center">
                <Typography variant="h1">{isNew ? "New estimate" : "Basement finish"}</Typography>
                <StatusTag>Draft · v1</StatusTag>
              </Stack>
              <Muted>Ruth Adeyemi · 811 Oak Hollow Dr, Round Rock, TX 78681 · Estimator Lena Ortiz</Muted>
            </Stack>
            <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center">
              <FormControlLabel control={<Switch checked={showCost} onChange={(e) => setShowCost(e.target.checked)} />} label="Internal cost & margin" sx={{ mr: 1, "& .MuiFormControlLabel-label": { fontSize: 13.5, fontWeight: 500 } }} />
              <Button component={Link} href={`/estimates/${isNew ? "est-2081" : id}/preview`}>
                Preview PDF
              </Button>
              <Button disabled={!dirty}>Save draft</Button>
              <Button variant="contained" color="primary" onClick={submitForm}>
                Issue estimate
              </Button>
            </Stack>
          </Stack>

          <SplitLayout
            main={
              <>
                <SectionCard title="Line items" action={<Button size="small">Add from catalog</Button>}>
                  <LineItems showCost={showCost} />
                </SectionCard>
                <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", md: "3fr 2fr" } }}>
                  <SectionCard title="Scope of work" action={<Muted sx={{ fontSize: 12.5 }}>Shown on PDF</Muted>} bodySx={{ p: 2 }}>
                    <FormikTextField name="scope" aria-label="Scope of work" multiline minRows={6} />
                  </SectionCard>
                  <SectionCard title="Terms" action={<Muted sx={{ fontSize: 12.5 }}>Snapshotted when issued</Muted>} bodySx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
                    <FormikSelect name="terms" label="Template" options={["Standard residential · v4", "Small job · v2"]} />
                    <FormikSelect name="validFor" label="Valid for" options={["14 days", "30 days", "60 days"]} />
                    <Muted sx={{ fontSize: 13 }}>Allowance items are billed at actual cost; differences are handled by change order.</Muted>
                  </SectionCard>
                </Box>
              </>
            }
            side={
              <>
                <Summary showCost={showCost} />
                <SectionCard title="Versions" bodySx={{ p: 2.5, display: "flex", flexDirection: "column", gap: 1 }}>
                  <Stack direction="row" justifyContent="space-between">
                    <Stack direction="row" gap={1} alignItems="center">
                      <Num sx={{ fontWeight: 500 }}>v1</Num>
                      <StatusTag>Draft</StatusTag>
                    </Stack>
                    <Muted sx={{ fontSize: 13 }}>Editing now</Muted>
                  </Stack>
                  <Muted sx={{ fontSize: 13 }}>Issuing locks v1 as an immutable snapshot. Later edits create v2.</Muted>
                </SectionCard>
                <SectionCard title="Customer" action={<Link href="/customers/adeyemi">Open</Link>} bodySx={{ p: 2.5 }}>
                  <Stack direction="row" gap={1.5} alignItems="center">
                    <InitialsAvatar name="Ruth Adeyemi" size={32} />
                    <Stack>
                      <Box sx={{ fontWeight: 500 }}>Ruth Adeyemi</Box>
                      <Muted sx={{ fontSize: 13 }}>ruth.adeyemi@yahoo.com</Muted>
                    </Stack>
                  </Stack>
                </SectionCard>
              </>
            }
          />
          <IssueDialog
            open={issueOpen}
            onClose={() => setIssueOpen(false)}
            onIssue={() => {
              setIssueOpen(false);
              router.push(`/estimates/${isNew ? "est-2081" : id}/preview`);
            }}
          />
        </Form>
      )}
    </Formik>
  );
}
