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
import { FieldRow, FormikSelect, FormikTextField } from "@web/components/form";
import { FormDrawer, KeyValue, Muted, TwoLine } from "@web/components/ui";
import { Yup } from "@web/lib/validation";
import { tokens } from "@web/theme/tokens";
import type { CustomerDto } from "@shared/contracts/customers";
import type { ProjectDto } from "@shared/contracts/projects";
import {
  INVOICE_TYPE_LABELS,
  INVOICE_TYPES,
  type InvoiceDetail,
  type InvoiceInput,
  type InvoiceType,
} from "@shared/contracts/invoices";
import { computeTotals, fromCents, toCents } from "@shared/lib/invoice-math";
import { applyApiError, customersApi } from "@web/features/customers/api";
import { projectsApi } from "@web/features/projects/api";
import { addDays, invoicesApi, todayYmd, usd } from "./api";

type Item = { description: string; quantity: string; unit: string; unit_price: string; taxable: boolean };
type Values = {
  customer_id: string;
  project_id: string;
  invoice_type: InvoiceType;
  issue_date: string;
  terms_days: string;
  due_date: string;
  tax_rate: string;
  discount: string;
  customer_notes: string;
  terms: string;
  items: Item[];
};

const TERMS = [
  { value: "0", label: "Due on receipt" },
  { value: "7", label: "Net 7" },
  { value: "15", label: "Net 15" },
  { value: "30", label: "Net 30" },
  { value: "45", label: "Net 45" },
  { value: "custom", label: "Custom date" },
];

const blankItem = (): Item => ({ description: "", quantity: "1", unit: "ea", unit_price: "", taxable: true });

const money = Yup.string()
  .trim()
  .matches(/^\d{1,10}(\.\d{1,2})?$/, "Use a number like 250 or 250.50.");

const schema = Yup.object({
  customer_id: Yup.string().required("Choose a customer."),
  issue_date: Yup.string().required("Choose the invoice date."),
  due_date: Yup.string()
    .required("Choose a due date.")
    .test("after", "Due date can't be before the invoice date.", function (v) {
      return !v || !this.parent.issue_date || v >= this.parent.issue_date;
    }),
  tax_rate: Yup.string()
    .trim()
    .matches(/^\d{1,2}(\.\d{1,3})?$|^100$/, "Enter a rate like 8.25."),
  discount: money,
  items: Yup.array()
    .of(
      Yup.object({
        description: Yup.string().trim().required("Required"),
        quantity: Yup.string()
          .trim()
          .required("Required")
          .matches(/^\d{1,8}(\.\d{1,3})?$/, "Invalid")
          .test("pos", "Must be > 0", (v) => Number(v) > 0),
        unit_price: money.required("Required"),
      }),
    )
    .min(1, "Add at least one line item."),
});

const isMoney = (v: string) => /^\d{1,10}(\.\d{1,2})?$/.test(v.trim());
const isQty = (v: string) => /^\d{1,8}(\.\d{1,3})?$/.test(v.trim());
const isRate = (v: string) => /^\d{1,2}(\.\d{1,3})?$|^100$/.test(v.trim());

function fromDetail(inv: InvoiceDetail): Values {
  const days = inv.due_date ? Math.round((Date.parse(inv.due_date) - Date.parse(inv.issue_date)) / 86_400_000) : 0;
  const preset = TERMS.find((t) => t.value === String(days));
  return {
    customer_id: inv.customer.id,
    project_id: inv.project?.id ?? "",
    invoice_type: inv.invoice_type,
    issue_date: inv.issue_date,
    terms_days: preset ? preset.value : "custom",
    due_date: inv.due_date ?? inv.issue_date,
    tax_rate: inv.tax_rate,
    discount: Number(inv.discount_total) ? inv.discount_total : "",
    customer_notes: inv.customer_notes ?? "",
    terms: inv.terms ?? "",
    items: inv.items.map((i) => ({ description: i.description, quantity: i.quantity, unit: i.unit, unit_price: i.unit_price, taxable: i.taxable })),
  };
}

export type InvoicePrefill = { customer?: { id: string; display_name: string }; project_id?: string; invoice_type?: InvoiceType };

/** Create or edit a draft invoice. */
export function InvoiceDrawer({
  invoice,
  prefill,
  onClose,
  onSaved,
}: {
  invoice: InvoiceDetail | null;
  prefill?: InvoicePrefill;
  onClose: () => void;
  onSaved: (inv: InvoiceDetail) => void;
}) {
  const isNew = !invoice;
  const today = todayYmd();
  const initial: Values = invoice
    ? fromDetail(invoice)
    : {
        customer_id: prefill?.customer?.id ?? "",
        project_id: prefill?.project_id ?? "",
        invoice_type: prefill?.invoice_type ?? "standard",
        issue_date: today,
        terms_days: "15",
        due_date: addDays(today, 15),
        tax_rate: "0",
        discount: "",
        customer_notes: "",
        terms: "",
        items: [blankItem()],
      };

  return (
    <FormDrawer open onClose={onClose} width={880}>
      <Formik<Values>
        initialValues={initial}
        validationSchema={schema}
        onSubmit={async (v, { setStatus, setFieldError }) => {
          setStatus(null);
          const input: InvoiceInput = {
            customer_id: v.customer_id,
            project_id: v.project_id || null,
            invoice_type: v.invoice_type,
            issue_date: v.issue_date,
            due_date: v.due_date,
            tax_rate: v.tax_rate.trim() || "0",
            discount: v.discount.trim() || "0",
            customer_notes: v.customer_notes,
            terms: v.terms,
            items: v.items.map((i) => ({ ...i, unit: i.unit.trim() || "ea" })),
          };
          try {
            onSaved(isNew ? await invoicesApi.create(input) : await invoicesApi.update(invoice.id, input));
          } catch (e) {
            setStatus(applyApiError(e, setFieldError));
          }
        }}
      >
        {({ isSubmitting, status, values, errors, touched, setFieldValue }) => (
          <Form noValidate>
            <DialogTitle>{isNew ? "New invoice" : `Edit ${invoice.invoice_number}`}</DialogTitle>
            <DialogContent>
              <Stack gap={3}>
                {status && <Alert severity="error">{status}</Alert>}

                <Stack gap={2}>
                  <FieldRow min={260}>
                    <CustomerField initial={invoice?.customer ?? prefill?.customer ?? null} />
                    <ProjectField />
                  </FieldRow>
                  <FieldRow min={180}>
                    <FormikSelect
                      name="invoice_type"
                      label="Type"
                      options={INVOICE_TYPES.map((t) => ({ value: t, label: INVOICE_TYPE_LABELS[t] }))}
                    />
                    <FormikTextField
                      name="issue_date"
                      label="Invoice date"
                      type="date"
                      onChange={(e) => {
                        setFieldValue("issue_date", e.target.value);
                        if (values.terms_days !== "custom" && e.target.value)
                          setFieldValue("due_date", addDays(e.target.value, Number(values.terms_days)));
                      }}
                    />
                    <FormikSelect
                      name="terms_days"
                      label="Payment terms"
                      options={TERMS}
                      onChange={(e) => {
                        setFieldValue("terms_days", e.target.value);
                        if (e.target.value !== "custom" && values.issue_date)
                          setFieldValue("due_date", addDays(values.issue_date, Number(e.target.value)));
                      }}
                    />
                    <FormikTextField
                      name="due_date"
                      label="Due date"
                      type="date"
                      onChange={(e) => (setFieldValue("due_date", e.target.value), setFieldValue("terms_days", "custom"))}
                    />
                  </FieldRow>
                </Stack>

                <Stack gap={1}>
                  <Typography variant="h3">Line items</Typography>
                  <FieldArray name="items">
                    {({ push, remove }) => (
                      <Box sx={{ border: `1px solid ${tokens.border}`, borderRadius: "10px", overflow: "hidden" }}>
                        <Box
                          sx={{
                            display: { xs: "none", sm: "grid" },
                            gridTemplateColumns: COLS,
                            gap: 1,
                            px: 1.5,
                            py: 1,
                            bgcolor: tokens.surfaceMuted,
                            borderBottom: `1px solid ${tokens.divider}`,
                            fontSize: 12,
                            fontWeight: 600,
                            color: "text.secondary",
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                          }}
                        >
                          <span>Description</span>
                          <span>Qty</span>
                          <span>Unit</span>
                          <span>Rate</span>
                          <Box component="span" sx={{ textAlign: "center" }}>
                            Tax
                          </Box>
                          <Box component="span" sx={{ textAlign: "right" }}>
                            Amount
                          </Box>
                          <span />
                        </Box>
                        {values.items.map((it, i) => (
                          <LineRow key={i} index={i} item={it} canRemove={values.items.length > 1} onRemove={() => remove(i)} />
                        ))}
                        <Box sx={{ px: 1.5, py: 1 }}>
                          <Button size="small" startIcon={<AddOutlined />} onClick={() => push(blankItem())} disabled={values.items.length >= 100}>
                            Add line
                          </Button>
                        </Box>
                      </Box>
                    )}
                  </FieldArray>
                  {typeof errors.items === "string" && touched.items && <FormHelperText error>{errors.items}</FormHelperText>}
                </Stack>

                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 320px" }, gap: 3, alignItems: "start" }}>
                  <Stack gap={2}>
                    <FormikTextField name="customer_notes" label="Note to customer" placeholder="Optional · shown on the invoice" multiline minRows={2} />
                    <FormikTextField name="terms" label="Terms" placeholder="Optional · e.g. late fee policy" multiline minRows={2} />
                  </Stack>
                  <TotalsPreview />
                </Box>
              </Stack>
            </DialogContent>
            <DialogActions>
              <Muted sx={{ fontSize: 12.5, mr: "auto", pl: 1 }}>Saved as a draft. You can review it before issuing.</Muted>
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

const COLS = "minmax(0, 1fr) 72px 64px 104px 44px 104px 36px";

function LineRow({ index, item, canRemove, onRemove }: { index: number; item: Item; canRemove: boolean; onRemove: () => void }) {
  const { errors, touched } = useFormikContext<Values>();
  const err = (k: keyof Item) => (getIn(touched, `items.${index}.${k}`) && getIn(errors, `items.${index}.${k}`)) as string | undefined;
  const amount = isQty(item.quantity) && isMoney(item.unit_price) ? usd(fromCents(computeTotals([{ quantity: item.quantity.trim(), unitPriceCents: toCents(item.unit_price.trim()), taxable: false }], 0, "0").subtotal)) : "—";
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr 1fr", sm: COLS },
        gap: 1,
        px: 1.5,
        py: 1,
        alignItems: "start",
        borderBottom: `1px solid ${tokens.divider}`,
        "& .MuiInputBase-input": { py: "8px", fontSize: 14 },
      }}
    >
      <Box sx={{ gridColumn: { xs: "1 / -1", sm: "auto" } }}>
        <CellField name={`items.${index}.description`} placeholder="e.g. Install base cabinets" error={err("description")} autoFocus={index > 0 && !item.description} />
      </Box>
      <CellField name={`items.${index}.quantity`} placeholder="1" error={err("quantity")} inputMode="decimal" />
      <CellField name={`items.${index}.unit`} placeholder="ea" />
      <CellField name={`items.${index}.unit_price`} placeholder="0.00" error={err("unit_price")} inputMode="decimal" startAdornment="$" />
      <TaxCell name={`items.${index}.taxable`} />
      <Box sx={{ textAlign: "right", pt: "9px", fontSize: 14, fontVariantNumeric: "tabular-nums", fontWeight: 500 }}>{amount}</Box>
      <Tooltip title={canRemove ? "Remove line" : "An invoice needs at least one line"}>
        <span>
          <IconButton size="small" aria-label={`Remove line ${index + 1}`} onClick={onRemove} disabled={!canRemove} sx={{ mt: "3px" }}>
            <DeleteOutline fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  );
}

function CellField({
  name,
  placeholder,
  error,
  inputMode,
  startAdornment,
  autoFocus,
}: {
  name: string;
  placeholder?: string;
  error?: string;
  inputMode?: "decimal";
  startAdornment?: string;
  autoFocus?: boolean;
}) {
  const [field] = useField(name);
  return (
    <TextField
      {...field}
      size="small"
      fullWidth
      autoFocus={autoFocus}
      placeholder={placeholder}
      error={!!error}
      helperText={error}
      inputProps={{ inputMode, "aria-label": name.split(".").pop() }}
      InputProps={startAdornment ? { startAdornment: <Box sx={{ color: "text.secondary", mr: 0.5 }}>{startAdornment}</Box> } : undefined}
    />
  );
}

function TaxCell({ name }: { name: string }) {
  const [field] = useField({ name, type: "checkbox" });
  return (
    <Box sx={{ textAlign: "center" }}>
      <Checkbox {...field} checked={!!field.value} size="small" inputProps={{ "aria-label": "Taxable" }} />
    </Box>
  );
}

/** Client preview of the server math (the server recalculates on save). */
function TotalsPreview() {
  const { values } = useFormikContext<Values>();
  const t = useMemo(() => {
    const lines = values.items
      .filter((i) => isQty(i.quantity) && isMoney(i.unit_price))
      .map((i) => ({ quantity: i.quantity.trim(), unitPriceCents: toCents(i.unit_price.trim()), taxable: i.taxable }));
    const discount = isMoney(values.discount || "0") ? toCents((values.discount || "0").trim()) : 0;
    return computeTotals(lines, discount, isRate(values.tax_rate || "0") ? (values.tax_rate || "0").trim() : "0");
  }, [values.items, values.discount, values.tax_rate]);
  const overDiscount = isMoney(values.discount || "0") && toCents((values.discount || "0").trim()) > t.subtotal;

  return (
    <Stack gap={1.25} sx={{ p: 2, borderRadius: "10px", bgcolor: tokens.surfaceMuted, border: `1px solid ${tokens.border}` }}>
      <KeyValue k="Subtotal" v={usd(fromCents(t.subtotal))} />
      <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
        <Muted sx={{ fontSize: 14 }}>Discount</Muted>
        <Box sx={{ width: 120 }}>
          <InlineField name="discount" placeholder="0.00" adornment="$" />
        </Box>
      </Stack>
      <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
        <Muted sx={{ fontSize: 14 }}>Tax rate</Muted>
        <Box sx={{ width: 120 }}>
          <InlineField name="tax_rate" placeholder="0" adornment="%" end />
        </Box>
      </Stack>
      <KeyValue k="Tax" v={usd(fromCents(t.tax))} />
      <Box sx={{ borderTop: `1px solid ${tokens.border}`, pt: 1.25 }}>
        <KeyValue k="Total" v={usd(fromCents(t.total))} strong />
      </Box>
      {overDiscount && <FormHelperText error>Discount can&apos;t be more than the subtotal.</FormHelperText>}
      <Muted sx={{ fontSize: 12 }}>Tax applies to lines marked “Tax”, after the discount.</Muted>
    </Stack>
  );
}

function InlineField({ name, placeholder, adornment, end }: { name: string; placeholder: string; adornment: string; end?: boolean }) {
  const [field, meta] = useField(name);
  const a = <Box sx={{ color: "text.secondary", [end ? "ml" : "mr"]: 0.5 }}>{adornment}</Box>;
  return (
    <TextField
      {...field}
      size="small"
      placeholder={placeholder}
      error={meta.touched && !!meta.error}
      helperText={meta.touched && meta.error}
      inputProps={{ inputMode: "decimal", "aria-label": name, style: { textAlign: "right" } }}
      InputProps={end ? { endAdornment: a } : { startAdornment: a }}
      sx={{ bgcolor: "#fff", "& .MuiInputBase-input": { py: "6px" } }}
    />
  );
}

type CustomerOption = Pick<CustomerDto, "id" | "display_name"> & Partial<CustomerDto>;

function CustomerField({ initial }: { initial: { id: string; display_name: string } | null }) {
  const { setFieldValue, setFieldTouched, touched, errors } = useFormikContext<Values>();
  const [value, setValue] = useState<CustomerOption | null>(initial);
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<CustomerOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
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
  }, [input]);

  const showError = touched.customer_id && !!errors.customer_id;
  return (
    <Stack gap={0.75}>
      <FormLabel htmlFor="customer_id" error={showError}>
        Bill to
      </FormLabel>
      <Autocomplete
        id="customer_id"
        value={value}
        options={options}
        loading={loading}
        filterOptions={(x) => x}
        getOptionLabel={(o) => o.display_name}
        isOptionEqualToValue={(a, b) => a.id === b.id}
        onInputChange={(_, v, reason) => reason === "input" && setInput(v)}
        onChange={(_, c) => {
          setValue(c);
          setFieldValue("customer_id", c?.id ?? "");
          setFieldValue("project_id", "");
        }}
        onBlur={() => setFieldTouched("customer_id", true)}
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        renderOption={({ key, ...props }, o) => (
          <li key={o.id} {...props}>
            <TwoLine title={o.display_name} sub={[o.email, o.billing_city].filter(Boolean).join(" · ") || undefined} />
          </li>
        )}
        noOptionsText={input ? "No matching customers" : "No active customers yet"}
        renderInput={(params) => <TextField {...params} placeholder="Search customers" error={showError} helperText={showError ? errors.customer_id : undefined} />}
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
        helperText={!values.customer_id ? "Choose a customer first." : projects.length ? undefined : "This customer has no projects."}
      >
        <MenuItem value="">
          <Muted>No project</Muted>
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
