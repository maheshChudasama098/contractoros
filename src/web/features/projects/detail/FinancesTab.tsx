"use client";

import AddOutlined from "@mui/icons-material/AddOutlined";
import AttachFileOutlined from "@mui/icons-material/AttachFileOutlined";
import DeleteOutline from "@mui/icons-material/DeleteOutline";
import EditOutlined from "@mui/icons-material/EditOutlined";
import ReceiptLongOutlined from "@mui/icons-material/ReceiptLongOutlined";
import UploadFileOutlined from "@mui/icons-material/UploadFileOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TableSortLabel from "@mui/material/TableSortLabel";
import Tooltip from "@mui/material/Tooltip";
import { Form, Formik } from "formik";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ConfirmDialog } from "@web/components/dialogs";
import { FieldRow, FormikSelect, FormikTextField } from "@web/components/form";
import { EmptyState, KpiStrip, Muted, SectionCard, Segmented, StatusTag } from "@web/components/ui";
import { Yup } from "@web/lib/validation";
import { tokens, type Tone } from "@web/theme/tokens";
import type { MasterOption } from "@shared/contracts/masters";
import type { ExpenseDto, ExpenseInput, ProjectChangeOrderDto, ProjectInvoiceDto } from "@shared/contracts/project-detail";
import type { ProjectDto } from "@shared/contracts/projects";
import { applyApiError } from "@web/features/customers/api";
import { fmtDay, masterOptions, todayYmd, usd, type ProjectDetailApi } from "./api";

type Sub = "budget" | "invoices" | "change_orders";

export function FinancesTab({ project, api, onChanged }: { project: ProjectDto; api: ProjectDetailApi; onChanged: () => void }) {
  const [sub, setSub] = useState<Sub>("budget");
  return (
    <>
      <Box>
        <Segmented
          label="Budget sections"
          value={sub}
          onChange={setSub}
          options={[
            { value: "budget", label: "Expenses" },
            { value: "invoices", label: "Invoices" },
            { value: "change_orders", label: "Change orders" },
          ]}
        />
      </Box>
      {sub === "budget" && <Budget project={project} api={api} onChanged={onChanged} />}
      {sub === "invoices" && <Invoices api={api} />}
      {sub === "change_orders" && <ChangeOrders api={api} />}
    </>
  );
}

// ---------------------------------------------------------------- Budget / expenses

type SortKey = "expense_date" | "description" | "category" | "amount";

function Budget({ project, api, onChanged }: { project: ProjectDto; api: ProjectDetailApi; onChanged: () => void }) {
  const [expenses, setExpenses] = useState<ExpenseDto[] | null>(null);
  const [categories, setCategories] = useState<MasterOption[]>([]);
  const [methods, setMethods] = useState<MasterOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "expense_date", dir: "desc" });
  const [editing, setEditing] = useState<ExpenseDto | "new" | null>(null);
  const [deleting, setDeleting] = useState<ExpenseDto | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [receiptFor, setReceiptFor] = useState<ExpenseDto | null>(null);

  const load = useCallback(() => {
    Promise.all([api.expenses(), masterOptions("expense_category"), masterOptions("payment_method")])
      .then(([e, c, m]) => (setExpenses(e), setCategories(c), setMethods(m), setError(null)))
      .catch((err: Error) => setError(err.message));
  }, [api]);
  useEffect(load, [load]);
  const refresh = () => (load(), onChanged());

  const rows = useMemo(() => {
    const val = (e: ExpenseDto) =>
      sort.key === "amount" ? Number(e.amount) : sort.key === "category" ? (e.category?.name ?? "") : e[sort.key];
    return [...(expenses ?? [])].sort((a, b) => {
      const [x, y] = [val(a), val(b)];
      const c = typeof x === "number" ? x - (y as number) : String(x).localeCompare(String(y));
      return sort.dir === "asc" ? c : -c;
    });
  }, [expenses, sort]);

  const total = (expenses ?? []).reduce((s, e) => s + Number(e.amount), 0);
  const contract = Number(project.contract_value);
  const byCategory = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of expenses ?? []) m.set(e.category?.name ?? "Uncategorized", (m.get(e.category?.name ?? "Uncategorized") ?? 0) + Number(e.amount));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [expenses]);

  const sortHead = (key: SortKey, label: string, align?: "right") => (
    <TableCell align={align} sortDirection={sort.key === key ? sort.dir : false}>
      <TableSortLabel
        active={sort.key === key}
        direction={sort.key === key ? sort.dir : "asc"}
        onClick={() => setSort((s) => ({ key, dir: s.key === key && s.dir === "asc" ? "desc" : "asc" }))}
      >
        {label}
      </TableSortLabel>
    </TableCell>
  );

  const pickReceipt = async (file: File | undefined) => {
    const target = receiptFor;
    setReceiptFor(null);
    if (fileInput.current) fileInput.current.value = "";
    if (!file || !target) return;
    try {
      await api.uploadReceipt(target.id, file);
      setToast("Receipt attached");
      load();
    } catch (e) {
      setToast(applyApiError(e, () => {}) ?? "Could not upload receipt");
    }
  };

  return (
    <>
      {error && <Alert severity="error">{error}</Alert>}
      <KpiStrip
        items={[
          { label: "Contract value", value: usd(contract) },
          { label: "Total expenses", value: usd(total) },
          {
            label: contract - total >= 0 ? "Remaining margin" : "Over budget by",
            value: usd(Math.abs(contract - total)),
            hintTone: contract && contract - total < 0 ? "danger" : undefined,
            hint: contract ? `${Math.round((total / contract) * 100)}% of contract spent` : "No contract value set",
          },
          { label: "Top category", value: byCategory[0]?.[0] ?? "—", hint: byCategory[0] ? usd(byCategory[0][1]) : undefined },
        ]}
      />

      <SectionCard
        title="Expenses"
        action={
          <Button variant="contained" color="primary" startIcon={<AddOutlined />} onClick={() => setEditing("new")}>
            Add expense
          </Button>
        }
      >
        {expenses && expenses.length === 0 ? (
          <EmptyState icon={<ReceiptLongOutlined />} title="No expenses yet" body="Log materials, labor and other job costs to track the budget." />
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  {sortHead("expense_date", "Date")}
                  {sortHead("description", "Description")}
                  {sortHead("category", "Category")}
                  <TableCell>Vendor</TableCell>
                  {sortHead("amount", "Amount", "right")}
                  <TableCell>Payment</TableCell>
                  <TableCell align="center">Receipt</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((e) => (
                  <TableRow key={e.id} hover>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>{fmtDay(e.expense_date)}</TableCell>
                    <TableCell>{e.description}</TableCell>
                    <TableCell sx={{ color: tokens.brand }}>{e.category?.name ?? <Muted>—</Muted>}</TableCell>
                    <TableCell>{e.vendor ?? <Muted>—</Muted>}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, typography: "num" }}>
                      {usd(e.amount)}
                    </TableCell>
                    <TableCell>{e.payment_method?.name ?? <Muted>—</Muted>}</TableCell>
                    <TableCell align="center">
                      {e.receipt ? (
                        <Tooltip title={`Open ${e.receipt.filename}`}>
                          <IconButton size="small" component="a" href={api.receiptUrl(e.id)} target="_blank" rel="noopener" aria-label="Open receipt">
                            <AttachFileOutlined fontSize="small" sx={{ color: tokens.brand }} />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <Tooltip title="Attach receipt">
                          <IconButton size="small" aria-label="Attach receipt" onClick={() => (setReceiptFor(e), fileInput.current?.click())}>
                            <UploadFileOutlined fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                      <IconButton size="small" aria-label="Edit expense" onClick={() => setEditing(e)}>
                        <EditOutlined fontSize="small" />
                      </IconButton>
                      <IconButton size="small" aria-label="Delete expense" onClick={() => setDeleting(e)}>
                        <DeleteOutline fontSize="small" sx={{ color: tokens.danger }} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {expenses && expenses.length > 0 && (
                  <TableRow>
                    <TableCell colSpan={4} sx={{ fontWeight: 600 }}>
                      Total
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, typography: "num" }}>
                      {usd(total)}
                    </TableCell>
                    <TableCell colSpan={3} />
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </SectionCard>
      <input ref={fileInput} type="file" hidden accept="image/png,image/jpeg,image/webp,application/pdf" onChange={(e) => pickReceipt(e.target.files?.[0])} />

      {editing && (
        <ExpenseDialog
          api={api}
          expense={editing === "new" ? null : editing}
          categories={categories}
          methods={methods}
          onClose={() => setEditing(null)}
          onSaved={(msg) => (setEditing(null), setToast(msg), refresh())}
        />
      )}
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        destructive
        title={`Delete "${deleting?.description}"?`}
        description={deleting ? `${usd(deleting.amount)} on ${fmtDay(deleting.expense_date)}.` : undefined}
        confirmLabel="Delete expense"
        onConfirm={async () => {
          try {
            await api.deleteExpense(deleting!.id);
            setToast("Expense deleted");
            refresh();
          } catch (e) {
            setToast(applyApiError(e, () => {}) ?? "Could not delete expense");
          }
        }}
      />
      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)} message={toast} />
    </>
  );
}

type ExpenseForm = { expense_date: string; description: string; category: string; vendor: string; amount: string; payment_method: string };

/** Keeps an inactive master value selectable on old rows so editing doesn't silently clear it. */
const withCurrent = (opts: MasterOption[], current: { code: string; name: string } | null | undefined) =>
  current && !opts.some((o) => o.value === current.code) ? [...opts, { value: current.code, label: `${current.name} (inactive)` }] : opts;

function ExpenseDialog({
  api,
  expense,
  categories,
  methods,
  onClose,
  onSaved,
}: {
  api: ProjectDetailApi;
  expense: ExpenseDto | null;
  categories: MasterOption[];
  methods: MasterOption[];
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const isNew = !expense;
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <Formik<ExpenseForm>
        initialValues={{
          expense_date: expense?.expense_date ?? todayYmd(),
          description: expense?.description ?? "",
          category: expense?.category?.code ?? "",
          vendor: expense?.vendor ?? "",
          amount: expense?.amount ?? "",
          payment_method: expense?.payment_method?.code ?? "",
        }}
        validationSchema={Yup.object({
          expense_date: Yup.string().required("Date is required."),
          description: Yup.string().trim().required("Description is required.").max(255),
          amount: Yup.string()
            .trim()
            .required("Amount is required.")
            .matches(/^\d{1,10}(\.\d{1,2})?$/, "Enter an amount like 120 or 120.50."),
        })}
        onSubmit={async (vals, { setStatus, setFieldError }) => {
          setStatus(null);
          const input: ExpenseInput = vals;
          try {
            if (isNew) await api.createExpense(input);
            else await api.updateExpense(expense.id, input);
            onSaved(isNew ? "Expense added" : "Expense updated");
          } catch (e) {
            setStatus(applyApiError(e, setFieldError));
          }
        }}
      >
        {({ isSubmitting, status }) => (
          <Form noValidate>
            <DialogTitle>{isNew ? "Add expense" : "Edit expense"}</DialogTitle>
            <DialogContent>
              <Stack gap={2}>
                {status && <Alert severity="error">{status}</Alert>}
                <FormikTextField name="description" label="Description" placeholder="Lumber for framing" autoFocus />
                <FieldRow>
                  <FormikTextField name="expense_date" label="Date" type="date" />
                  <FormikTextField name="amount" label="Amount (USD)" inputMode="decimal" placeholder="0.00" />
                </FieldRow>
                <FieldRow>
                  <FormikSelect
                    name="category"
                    label="Category"
                    options={[{ value: "", label: "None" }, ...withCurrent(categories, expense?.category)]}
                    SelectProps={{ displayEmpty: true }}
                  />
                  <FormikSelect
                    name="payment_method"
                    label="Payment"
                    options={[{ value: "", label: "None" }, ...withCurrent(methods, expense?.payment_method)]}
                    SelectProps={{ displayEmpty: true }}
                  />
                </FieldRow>
                <FormikTextField name="vendor" label="Vendor" placeholder="Optional" />
                {isNew && <Muted sx={{ fontSize: 12.5 }}>You can attach a receipt from the expenses table after saving.</Muted>}
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={onClose}>Cancel</Button>
              <Button type="submit" variant="contained" color="primary" disabled={isSubmitting}>
                {isNew ? "Add expense" : "Save changes"}
              </Button>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </Dialog>
  );
}

// ---------------------------------------------------------------- Invoices & change orders (read-only for now)

const INVOICE_TONE: Record<string, Tone> = { draft: "neutral", issued: "info", partially_paid: "warning", paid: "success", overdue: "danger", void: "neutral" };
const CO_TONE: Record<string, Tone> = { draft: "neutral", issued: "info", approved: "success", declined: "danger" };
const label = (s: string) => s.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

function Invoices({ api }: { api: ProjectDetailApi }) {
  const [rows, setRows] = useState<ProjectInvoiceDto[] | null>(null);
  useEffect(() => void api.invoices().then(setRows).catch(() => setRows([])), [api]);
  return (
    <SectionCard title="Invoices">
      {rows && rows.length === 0 ? (
        <EmptyState icon={<ReceiptLongOutlined />} title="No invoices yet" body="Invoices for this project will show here once the Invoices module is set up." />
      ) : (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Invoice</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Issued</TableCell>
                <TableCell>Due</TableCell>
                <TableCell align="right">Total</TableCell>
                <TableCell align="right">Paid</TableCell>
                <TableCell align="right">Balance</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(rows ?? []).map((i) => (
                <TableRow key={i.id}>
                  <TableCell sx={{ fontWeight: 500 }}>{i.invoice_number}</TableCell>
                  <TableCell>
                    <StatusTag tone={INVOICE_TONE[i.status] ?? "neutral"}>{label(i.status)}</StatusTag>
                  </TableCell>
                  <TableCell>{fmtDay(i.issue_date)}</TableCell>
                  <TableCell>{fmtDay(i.due_date) || "—"}</TableCell>
                  <TableCell align="right">{usd(i.total)}</TableCell>
                  <TableCell align="right">{usd(i.amount_paid)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    {usd(i.balance_due)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </SectionCard>
  );
}

function ChangeOrders({ api }: { api: ProjectDetailApi }) {
  const [rows, setRows] = useState<ProjectChangeOrderDto[] | null>(null);
  useEffect(() => void api.changeOrders().then(setRows).catch(() => setRows([])), [api]);
  return (
    <SectionCard title="Change orders">
      {rows && rows.length === 0 ? (
        <EmptyState icon={<ReceiptLongOutlined />} title="No change orders" body="Change orders for this project will show here once the Change Orders module is set up." />
      ) : (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Number</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Price change</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(rows ?? []).map((c) => (
                <TableRow key={c.id}>
                  <TableCell sx={{ fontWeight: 500 }}>{c.change_order_number}</TableCell>
                  <TableCell>{c.title}</TableCell>
                  <TableCell>
                    <StatusTag tone={CO_TONE[c.status] ?? "neutral"}>{label(c.status)}</StatusTag>
                  </TableCell>
                  <TableCell>{new Date(c.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, color: Number(c.price_delta) < 0 ? tokens.danger : undefined }}>
                    {Number(c.price_delta) > 0 ? "+" : ""}
                    {usd(c.price_delta)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </SectionCard>
  );
}
