"use client";

import AddOutlined from "@mui/icons-material/AddOutlined";
import DeleteOutline from "@mui/icons-material/DeleteOutline";
import Alert from "@mui/material/Alert";
import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormHelperText from "@mui/material/FormHelperText";
import FormLabel from "@mui/material/FormLabel";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { FieldArray, Form, Formik, getIn, useField, useFormikContext } from "formik";
import { useEffect, useMemo, useState } from "react";
import { FieldRow, FormikTextField } from "@web/components/form";
import { FormDrawer, KeyValue, Muted, TwoLine } from "@web/components/ui";
import { Yup } from "@web/lib/validation";
import { tokens } from "@web/theme/tokens";
import type { CustomerDto } from "@shared/contracts/customers";
import type { ProjectDto } from "@shared/contracts/projects";
import { ITEM_TYPE_LABELS, ITEM_TYPES, type EstimateDetail, type EstimateInput, type ItemType } from "@shared/contracts/estimates";
import { computeTotals, fromCents, lineCents, toCents } from "@shared/lib/invoice-math";
import { applyApiError, customersApi } from "@web/features/customers/api";
import { projectsApi } from "@web/features/projects/api";
import { addDays, todayYmd, usd } from "@web/features/invoices/api";
import { estimatesApi } from "./api";

type Item = {
  item_type: ItemType;
  name: string;
  description: string;
  quantity: string;
  unit: string;
  unit_price: string;
  taxable: boolean;
  internal_unit_cost: string;
};
type Values = {
  customer_id: string;
  project_id: string;
  title: string;
  scope_description: string;
  valid_until: string;
  tax_rate: string;
  discount: string;
  customer_notes: string;
  terms: string;
  items: Item[];
};

const blank = (): Item => ({ item_type: "service", name: "", description: "", quantity: "1", unit: "ea", unit_price: "", taxable: true, internal_unit_cost: "" });
const isMoney = (v: string) => /^\d{1,10}(\.\d{1,2})?$/.test(v.trim());
const isQty = (v: string) => /^\d{1,8}(\.\d{1,3})?$/.test(v.trim());
const isRate = (v: string) => /^\d{1,2}(\.\d{1,3})?$|^100$/.test(v.trim());
const money = Yup.string()
  .trim()
  .matches(/^\d{1,10}(\.\d{1,2})?$/, "Use a number like 250.50");

const schema = Yup.object({
  customer_id: Yup.string().required("Choose a customer."),
  title: Yup.string().trim().required("Give the estimate a title.").max(180),
  tax_rate: Yup.string()
    .trim()
    .matches(/^\d{1,2}(\.\d{1,3})?$|^100$/, "Enter a rate like 8.25."),
  discount: money,
  items: Yup.array()
    .of(
      Yup.object({
        name: Yup.string().trim().required("Required"),
        quantity: Yup.string()
          .trim()
          .required("Required")
          .matches(/^\d{1,8}(\.\d{1,3})?$/, "Invalid")
          .test("pos", "Must be > 0", (v) => Number(v) > 0),
        unit_price: money.required("Required"),
        internal_unit_cost: money,
      }),
    )
    .min(1, "Add at least one line item."),
});

function fromDetail(e: EstimateDetail): Values {
  const v = e.version;
  return {
    customer_id: e.customer.id,
    project_id: e.project?.id ?? "",
    title: v.title,
    scope_description: v.scope_description ?? "",
    valid_until: v.valid_until ?? "",
    tax_rate: v.tax_rate,
    discount: Number(v.discount_total) ? v.discount_total : "",
    customer_notes: v.customer_notes ?? "",
    terms: v.terms ?? "",
    items: v.items.map((i) => ({
      item_type: i.item_type,
      name: i.name,
      description: i.description ?? "",
      quantity: i.quantity,
      unit: i.unit,
      unit_price: i.unit_price,
      taxable: i.taxable,
      internal_unit_cost: i.internal_unit_cost ?? "",
    })),
  };
}

/** Create an estimate, or edit its draft version. */
export function EstimateDrawer({
  estimate,
  canCost,
  prefill,
  onClose,
  onSaved,
}: {
  estimate: EstimateDetail | null;
  canCost: boolean;
  prefill?: { customer?: { id: string; display_name: string }; project_id?: string };
  onClose: () => void;
  onSaved: (e: EstimateDetail) => void;
}) {
  const isNew = !estimate;
  const initial: Values = estimate
    ? fromDetail(estimate)
    : {
        customer_id: prefill?.customer?.id ?? "",
        project_id: prefill?.project_id ?? "",
        title: "",
        scope_description: "",
        valid_until: addDays(todayYmd(), 30),
        tax_rate: "0",
        discount: "",
        customer_notes: "",
        terms: "",
        items: [blank()],
      };

  return (
    <FormDrawer open onClose={onClose} width={960}>
      <Formik<Values>
        initialValues={initial}
        validationSchema={schema}
        onSubmit={async (v, { setStatus, setFieldError }) => {
          setStatus(null);
          const input: EstimateInput = {
            ...v,
            project_id: v.project_id || null,
            valid_until: v.valid_until || null,
            tax_rate: v.tax_rate.trim() || "0",
            discount: v.discount.trim() || "0",
            items: v.items.map((i) => ({
              ...i,
              unit: i.unit.trim() || "ea",
              description: i.description || null,
              internal_unit_cost: canCost ? i.internal_unit_cost.trim() || null : undefined,
            })),
          };
          try {
            onSaved(isNew ? await estimatesApi.create(input) : await estimatesApi.update(estimate.id, input));
          } catch (e) {
            setStatus(applyApiError(e, setFieldError));
          }
        }}
      >
        {({ isSubmitting, status, values, errors, touched }) => (
          <Form noValidate>
            <DialogTitle>
              {isNew ? "New estimate" : `Edit ${estimate.estimate_number} · version ${estimate.version.version_number}`}
            </DialogTitle>
            <DialogContent>
              <Stack gap={3}>
                {status && <Alert severity="error">{status}</Alert>}
                <Stack gap={2}>
                  <FieldRow min={260}>
                    <CustomerField initial={estimate?.customer ?? prefill?.customer ?? null} locked={!!estimate && estimate.versions.some((v) => v.issued_at)} />
                    <ProjectField />
                  </FieldRow>
                  <FieldRow min={240}>
                    <FormikTextField name="title" label="Title" placeholder="e.g. Kitchen remodel" />
                    <FormikTextField name="valid_until" label="Valid until" type="date" hint="After this date the estimate shows as expired." />
                  </FieldRow>
                  <FormikTextField name="scope_description" label="Scope of work" placeholder="What's included, materials, exclusions…" multiline minRows={3} />
                </Stack>

                <Stack gap={1}>
                  <Stack direction="row" justifyContent="space-between" alignItems="baseline">
                    <Typography variant="h3">Line items</Typography>
                    {canCost && <Muted sx={{ fontSize: 12.5 }}>“Your cost” is internal — customers never see it.</Muted>}
                  </Stack>
                  <FieldArray name="items">
                    {({ push, remove }) => (
                      <Box sx={{ border: `1px solid ${tokens.border}`, borderRadius: "10px", overflow: "hidden" }}>
                        {values.items.map((it, i) => (
                          <LineRow key={i} index={i} item={it} canCost={canCost} canRemove={values.items.length > 1} onRemove={() => remove(i)} />
                        ))}
                        <Box sx={{ px: 1.5, py: 1 }}>
                          <Button size="small" startIcon={<AddOutlined />} onClick={() => push(blank())} disabled={values.items.length >= 200}>
                            Add line
                          </Button>
                        </Box>
                      </Box>
                    )}
                  </FieldArray>
                  {typeof errors.items === "string" && touched.items && <FormHelperText error>{errors.items}</FormHelperText>}
                </Stack>

                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 340px" }, gap: 3, alignItems: "start" }}>
                  <Stack gap={2}>
                    <FormikTextField name="customer_notes" label="Note to customer" placeholder="Optional" multiline minRows={2} />
                    <FormikTextField name="terms" label="Terms" placeholder="Optional · payment schedule, warranty…" multiline minRows={2} />
                  </Stack>
                  <TotalsPreview canCost={canCost} />
                </Box>
              </Stack>
            </DialogContent>
            <DialogActions>
              <Muted sx={{ fontSize: 12.5, mr: "auto", pl: 1 }}>Saved as a draft. Issue it when it&apos;s ready to send.</Muted>
              <Button onClick={onClose}>Cancel</Button>
              <Button type="submit" variant="contained" color="primary" disabled={isSubmitting}>
                {isNew ? "Create draft" : "Save changes"}
              </Button>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </FormDrawer>
  );
}

const MAIN = "120px minmax(0, 1fr) 72px 64px 110px 40px 110px 36px";

function LineRow({ index, item, canCost, canRemove, onRemove }: { index: number; item: Item; canCost: boolean; canRemove: boolean; onRemove: () => void }) {
  const { errors, touched, setFieldValue } = useFormikContext<Values>();
  const err = (k: keyof Item) => (getIn(touched, `items.${index}.${k}`) && getIn(errors, `items.${index}.${k}`)) as string | undefined;
  const ok = isQty(item.quantity) && isMoney(item.unit_price);
  const amount = ok ? usd(fromCents(lineCents(item.quantity.trim(), toCents(item.unit_price.trim())))) : "—";
  const p = `items.${index}`;
  return (
    <Box sx={{ px: 1.5, py: 1.25, borderBottom: `1px solid ${tokens.divider}`, "& .MuiInputBase-input": { py: "8px", fontSize: 14 } }}>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: MAIN }, gap: 1, alignItems: "start" }}>
        <TextField select size="small" value={item.item_type} onChange={(e) => setFieldValue(`${p}.item_type`, e.target.value)} inputProps={{ "aria-label": "Type" }}>
          {ITEM_TYPES.map((t) => (
            <MenuItem key={t} value={t}>
              {ITEM_TYPE_LABELS[t]}
            </MenuItem>
          ))}
        </TextField>
        <Cell name={`${p}.name`} placeholder="Item name" error={err("name")} label="Name" />
        <Cell name={`${p}.quantity`} placeholder="Qty" error={err("quantity")} label="Quantity" decimal />
        <Cell name={`${p}.unit`} placeholder="ea" label="Unit" />
        <Cell name={`${p}.unit_price`} placeholder="Rate" error={err("unit_price")} label="Rate" decimal adornment="$" />
        <Tooltip title="Taxable">
          <Box sx={{ textAlign: "center" }}>
            <TaxBox name={`${p}.taxable`} />
          </Box>
        </Tooltip>
        <Box sx={{ textAlign: "right", pt: "9px", fontSize: 14, fontVariantNumeric: "tabular-nums", fontWeight: 500 }}>{amount}</Box>
        <IconButton size="small" aria-label={`Remove line ${index + 1}`} onClick={onRemove} disabled={!canRemove} sx={{ mt: "3px" }}>
          <DeleteOutline fontSize="small" />
        </IconButton>
      </Box>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: canCost ? "120px minmax(0,1fr) 220px 76px" : "120px minmax(0,1fr) 76px" }, gap: 1, mt: 1 }}>
        <Box sx={{ display: { xs: "none", md: "block" } }} />
        <Cell name={`${p}.description`} placeholder="Description (optional, shown to customer)" label="Description" />
        {canCost && <Cell name={`${p}.internal_unit_cost`} placeholder="Your cost / unit" error={err("internal_unit_cost")} label="Your cost per unit" decimal adornment="$" />}
        <Box />
      </Box>
    </Box>
  );
}

function Cell({ name, placeholder, error, label, decimal, adornment }: { name: string; placeholder: string; error?: string; label: string; decimal?: boolean; adornment?: string }) {
  const [field] = useField(name);
  return (
    <TextField
      {...field}
      value={field.value ?? ""}
      size="small"
      fullWidth
      placeholder={placeholder}
      error={!!error}
      helperText={error}
      inputProps={{ inputMode: decimal ? "decimal" : undefined, "aria-label": label }}
      InputProps={adornment ? { startAdornment: <Box sx={{ color: "text.secondary", mr: 0.5 }}>{adornment}</Box> } : undefined}
    />
  );
}

function TaxBox({ name }: { name: string }) {
  const [field] = useField({ name, type: "checkbox" });
  return <Checkbox {...field} checked={!!field.value} size="small" inputProps={{ "aria-label": "Taxable" }} />;
}

function TotalsPreview({ canCost }: { canCost: boolean }) {
  const { values } = useFormikContext<Values>();
  const t = useMemo(() => {
    const valid = values.items.filter((i) => isQty(i.quantity) && isMoney(i.unit_price));
    const lines = valid.map((i) => ({ quantity: i.quantity.trim(), unitPriceCents: toCents(i.unit_price.trim()), taxable: i.taxable }));
    const discount = isMoney(values.discount || "0") ? toCents((values.discount || "0").trim()) : 0;
    const totals = computeTotals(lines, discount, isRate(values.tax_rate || "0") ? (values.tax_rate || "0").trim() : "0");
    const costed = valid.filter((i) => isMoney(i.internal_unit_cost));
    const cost = costed.reduce((s, i) => s + lineCents(i.quantity.trim(), toCents(i.internal_unit_cost.trim())), 0);
    return { ...totals, cost: costed.length ? cost : null };
  }, [values.items, values.discount, values.tax_rate]);
  const revenue = t.subtotal - t.discount;
  const margin = t.cost == null ? null : revenue - t.cost;

  return (
    <Stack gap={1.25} sx={{ p: 2, borderRadius: "10px", bgcolor: tokens.surfaceMuted, border: `1px solid ${tokens.border}` }}>
      <KeyValue k="Subtotal" v={usd(fromCents(t.subtotal))} />
      <Inline label="Discount" name="discount" adornment="$" />
      <Inline label="Tax rate" name="tax_rate" adornment="%" end />
      <KeyValue k="Tax" v={usd(fromCents(t.tax))} />
      <Box sx={{ borderTop: `1px solid ${tokens.border}`, pt: 1.25 }}>
        <KeyValue k="Total" v={usd(fromCents(t.total))} strong />
      </Box>
      {canCost && (
        <Box sx={{ borderTop: `1px dashed ${tokens.borderStrong}`, pt: 1.25 }}>
          <KeyValue k="Your cost" v={t.cost == null ? "—" : usd(fromCents(t.cost))} />
          <KeyValue
            k="Margin"
            v={
              margin == null ? (
                "—"
              ) : (
                <Box component="span" sx={{ color: margin < 0 ? "error.main" : "success.main", fontWeight: 600 }}>
                  {usd(fromCents(margin))}
                  {revenue > 0 ? ` · ${Math.round((margin / revenue) * 1000) / 10}%` : ""}
                </Box>
              )
            }
          />
        </Box>
      )}
    </Stack>
  );
}

function Inline({ label, name, adornment, end }: { label: string; name: string; adornment: string; end?: boolean }) {
  const [field, meta] = useField(name);
  const a = <Box sx={{ color: "text.secondary", [end ? "ml" : "mr"]: 0.5 }}>{adornment}</Box>;
  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
      <Muted sx={{ fontSize: 14 }}>{label}</Muted>
      <TextField
        {...field}
        size="small"
        placeholder="0"
        error={meta.touched && !!meta.error}
        helperText={meta.touched && meta.error}
        inputProps={{ inputMode: "decimal", "aria-label": label, style: { textAlign: "right" } }}
        InputProps={end ? { endAdornment: a } : { startAdornment: a }}
        sx={{ width: 120, bgcolor: "#fff", "& .MuiInputBase-input": { py: "6px" } }}
      />
    </Stack>
  );
}

type CustomerOption = Pick<CustomerDto, "id" | "display_name"> & Partial<CustomerDto>;

function CustomerField({ initial, locked }: { initial: { id: string; display_name: string } | null; locked: boolean }) {
  const { setFieldValue, setFieldTouched, touched, errors } = useFormikContext<Values>();
  const [value, setValue] = useState<CustomerOption | null>(initial);
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<CustomerOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (locked) return;
    let live = true;
    setLoading(true);
    const t = setTimeout(() => {
      customersApi
        .list({ status: "active", q: input.trim() || undefined, per_page: 20 })
        .then((r) => live && setOptions(r.items))
        .catch(() => live && setOptions([]))
        .finally(() => live && setLoading(false));
    }, 250);
    return () => ((live = false), clearTimeout(t));
  }, [input, locked]);

  const showError = touched.customer_id && !!errors.customer_id;
  return (
    <Stack gap={0.75}>
      <FormLabel htmlFor="customer_id" error={showError}>
        Customer
      </FormLabel>
      <Autocomplete
        id="customer_id"
        value={value}
        options={options}
        loading={loading}
        disabled={locked}
        filterOptions={(x) => x}
        getOptionLabel={(o) => o.display_name}
        isOptionEqualToValue={(a, b) => a.id === b.id}
        onInputChange={(_, v, reason) => reason === "input" && setInput(v)}
        onChange={(_, c) => (setValue(c), setFieldValue("customer_id", c?.id ?? ""), setFieldValue("project_id", ""))}
        onBlur={() => setFieldTouched("customer_id", true)}
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        renderOption={({ key, ...props }, o) => (
          <li key={o.id} {...props}>
            <TwoLine title={o.display_name} sub={[o.email, o.billing_city].filter(Boolean).join(" · ") || undefined} />
          </li>
        )}
        noOptionsText={input ? "No matching customers" : "No active customers yet"}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder="Search customers"
            error={showError}
            helperText={showError ? errors.customer_id : locked ? "Fixed once a version was issued." : undefined}
          />
        )}
      />
    </Stack>
  );
}

function ProjectField() {
  const { values, setFieldValue } = useFormikContext<Values>();
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  useEffect(() => {
    if (!values.customer_id) return void setProjects([]);
    let live = true;
    projectsApi
      .list({ customer_id: values.customer_id, status: "all", per_page: 100, sort: "created_at", dir: "desc" })
      .then((r) => live && setProjects(r.items))
      .catch(() => live && setProjects([]));
    return () => void (live = false);
  }, [values.customer_id]);
  return (
    <Stack gap={0.75}>
      <FormLabel htmlFor="project_id">Project</FormLabel>
      <TextField
        id="project_id"
        select
        value={projects.some((p) => p.id === values.project_id) ? values.project_id : ""}
        onChange={(e) => setFieldValue("project_id", e.target.value)}
        disabled={!values.customer_id}
        SelectProps={{ displayEmpty: true }}
        helperText={!values.customer_id ? "Choose a customer first." : "Optional — a project is created when the contract is signed."}
      >
        <MenuItem value="">
          <Muted>No project yet</Muted>
        </MenuItem>
        {projects.map((p) => (
          <MenuItem key={p.id} value={p.id}>
            {p.project_number} · {p.name}
          </MenuItem>
        ))}
      </TextField>
    </Stack>
  );
}

