"use client";

import EditOutlined from "@mui/icons-material/EditOutlined";
import MoreHorizOutlined from "@mui/icons-material/MoreHorizOutlined";
import PaymentsOutlined from "@mui/icons-material/PaymentsOutlined";
import PrintOutlined from "@mui/icons-material/PrintOutlined";
import SendOutlined from "@mui/icons-material/SendOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import { Form, Formik } from "formik";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ConfirmDialog } from "@web/components/dialogs";
import { FieldRow, FormikSelect, FormikTextField } from "@web/components/form";
import { DetailList, FormDrawer, KeyValue, Muted, PageHeader, SectionCard, SplitLayout, StatusTag } from "@web/components/ui";
import { Yup } from "@web/lib/validation";
import { tokens } from "@web/theme/tokens";
import type { MasterOption } from "@shared/contracts/masters";
import {
  INVOICE_STATUS_LABELS,
  INVOICE_TYPE_LABELS,
  type InvoiceDetail,
  type InvoicePaymentDto,
} from "@shared/contracts/invoices";
import { applyApiError } from "@web/features/customers/api";
import { onboardingApi } from "@web/features/auth/onboarding-api";
import { INVOICE_TONE, fmtDate, invoicesApi, todayYmd, usd } from "./api";
import { InvoiceDrawer } from "./InvoiceDrawer";
import { InvoicePaper } from "./InvoicePaper";

const fmtWhen = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—";

const reasonSchema = Yup.object({ reason: Yup.string().trim().min(3, "Give a short reason.").max(255).required("Give a short reason.") });

export function InvoiceDetailView({ id }: { id: string }) {
  const router = useRouter();
  const [inv, setInv] = useState<InvoiceDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [paying, setPaying] = useState(false);
  const [confirm, setConfirm] = useState<"issue" | "void" | "delete" | null>(null);
  const [voidingPayment, setVoidingPayment] = useState<InvoicePaymentDto | null>(null);
  const [menu, setMenu] = useState<HTMLElement | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(() => {
    invoicesApi
      .get(id)
      .then((d) => (setInv(d), setError(null)))
      .catch((e: Error) => setError(e.message));
  }, [id]);
  useEffect(load, [load]);

  const run = async (fn: () => Promise<InvoiceDetail | void>, ok: string) => {
    try {
      const next = await fn();
      if (next) setInv(next);
      setToast(ok);
    } catch (e) {
      setToast(applyApiError(e, () => {}) ?? "Something went wrong");
    }
  };

  if (!inv) return error ? <Alert severity="error">{error}</Alert> : <CircularProgress sx={{ alignSelf: "center", mt: 6 }} />;

  const can = inv.can;
  const live = inv.payments.filter((p) => p.status === "succeeded");
  const hasMenu = can.void || can.delete;

  return (
    <>
      <PageHeader
        eyebrow={
          <Link href="/invoices" style={{ color: "inherit" }}>
            Invoices
          </Link>
        }
        title={
          <Stack direction="row" alignItems="center" gap={1.5} flexWrap="wrap">
            {inv.invoice_number}
            <StatusTag tone={INVOICE_TONE[inv.status]}>{INVOICE_STATUS_LABELS[inv.status]}</StatusTag>
          </Stack>
        }
        subtitle={
          <>
            <Link href={`/customers?q=${encodeURIComponent(inv.customer.display_name)}`} style={{ color: "inherit" }}>
              {inv.customer.display_name}
            </Link>
            {inv.project && (
              <>
                {" · "}
                <Link href={`/projects/${inv.project.id}?tab=finances`} style={{ color: "inherit" }}>
                  {inv.project.project_number} {inv.project.name}
                </Link>
              </>
            )}
            {" · "}
            {INVOICE_TYPE_LABELS[inv.invoice_type]} invoice
          </>
        }
        actions={
          <Stack direction="row" gap={1} flexWrap="wrap">
            <Button variant="outlined" startIcon={<PrintOutlined />} component="a" href={`/invoices/${inv.id}/print`} target="_blank" rel="noopener">
              Print / PDF
            </Button>
            {can.edit && (
              <Button variant="outlined" startIcon={<EditOutlined />} onClick={() => setEditing(true)}>
                Edit
              </Button>
            )}
            {can.issue && (
              <Button variant="contained" color="primary" startIcon={<SendOutlined />} onClick={() => setConfirm("issue")}>
                Issue invoice
              </Button>
            )}
            {can.record_payment && (
              <Button variant="contained" color="primary" startIcon={<PaymentsOutlined />} onClick={() => setPaying(true)}>
                Record payment
              </Button>
            )}
            {hasMenu && (
              <IconButton aria-label="More actions" onClick={(e) => setMenu(e.currentTarget)}>
                <MoreHorizOutlined />
              </IconButton>
            )}
          </Stack>
        }
      />

      {inv.status === "draft" && (
        <Alert severity="info">This is a draft. Customers don&apos;t see it, and you can still change anything. Issue it to lock the amounts and start tracking payment.</Alert>
      )}
      {inv.status === "overdue" && (
        <Alert severity="error">
          {usd(inv.balance_due)} is {inv.days_overdue} day{inv.days_overdue === 1 ? "" : "s"} past due (due {fmtDate(inv.due_date)}).
        </Alert>
      )}
      {inv.status === "void" && (
        <Alert severity="warning">
          Voided {fmtWhen(inv.voided_at)}
          {inv.void_reason ? ` — ${inv.void_reason}` : ""}. It no longer counts toward balances.
        </Alert>
      )}

      <SplitLayout
        main={<InvoicePaper inv={inv} />}
        side={
          <>
            <SectionCard title="Balance" bodySx={{ p: 2.5 }}>
              <Stack gap={1.25}>
                <KeyValue k="Total" v={usd(inv.total)} />
                <KeyValue k="Paid" v={usd(inv.amount_paid)} />
                <Box sx={{ borderTop: `1px solid ${tokens.border}`, pt: 1.25 }}>
                  <KeyValue k="Balance due" v={inv.status === "void" ? "—" : usd(inv.status === "draft" ? inv.total : inv.balance_due)} strong />
                </Box>
                {Number(inv.total) > 0 && inv.status !== "void" && inv.status !== "draft" && (
                  <Box sx={{ height: 6, borderRadius: 3, bgcolor: tokens.surfaceMuted, overflow: "hidden", mt: 0.5 }}>
                    <Box sx={{ height: "100%", width: `${Math.min(100, (Number(inv.amount_paid) / Number(inv.total)) * 100)}%`, bgcolor: "#15803D" }} />
                  </Box>
                )}
                {can.record_payment && (
                  <Button variant="outlined" startIcon={<PaymentsOutlined />} onClick={() => setPaying(true)} sx={{ mt: 1 }}>
                    Record payment
                  </Button>
                )}
              </Stack>
            </SectionCard>

            <SectionCard title={`Payments${live.length ? ` (${live.length})` : ""}`} bodySx={{ p: inv.payments.length ? 0 : 2.5 }}>
              {inv.payments.length === 0 ? (
                <Muted sx={{ fontSize: 13.5 }}>
                  {inv.status === "draft" ? "Issue the invoice to start recording payments." : "No payments recorded yet."}
                </Muted>
              ) : (
                inv.payments.map((p, i) => (
                  <PaymentRow key={p.id} p={p} last={i === inv.payments.length - 1} canVoid={can.record_payment || inv.status === "paid"} onVoid={() => setVoidingPayment(p)} />
                ))
              )}
            </SectionCard>

            <SectionCard title="Details" bodySx={{ p: 2.5 }}>
              <DetailList
                items={[
                  { k: "Type", v: INVOICE_TYPE_LABELS[inv.invoice_type] },
                  { k: "Invoice date", v: fmtDate(inv.issue_date) },
                  { k: "Due date", v: fmtDate(inv.due_date) },
                  { k: "Issued", v: fmtWhen(inv.issued_at) },
                  ...(inv.paid_at ? [{ k: "Paid in full", v: fmtWhen(inv.paid_at) }] : []),
                  { k: "Tax rate", v: `${inv.tax_rate}%` },
                ]}
              />
            </SectionCard>
          </>
        }
      />

      <Menu anchorEl={menu} open={!!menu} onClose={() => setMenu(null)}>
        {can.void && (
          <MenuItem sx={{ color: "error.main" }} onClick={() => (setMenu(null), setConfirm("void"))}>
            Void invoice
          </MenuItem>
        )}
        {can.delete && (
          <MenuItem sx={{ color: "error.main" }} onClick={() => (setMenu(null), setConfirm("delete"))}>
            Delete draft
          </MenuItem>
        )}
      </Menu>

      {editing && (
        <InvoiceDrawer
          invoice={inv}
          onClose={() => setEditing(false)}
          onSaved={(next) => (setEditing(false), setInv(next), setToast("Invoice saved"))}
        />
      )}
      {paying && (
        <PaymentDrawer
          inv={inv}
          onClose={() => setPaying(false)}
          onSaved={(next) => (setPaying(false), setInv(next), setToast(next.status === "paid" ? "Payment recorded — invoice paid in full" : "Payment recorded"))}
        />
      )}

      <ConfirmDialog
        open={confirm === "issue"}
        onClose={() => setConfirm(null)}
        title={`Issue ${inv.invoice_number}?`}
        description={`The amounts and customer details are locked once issued (total ${usd(inv.total)}, due ${fmtDate(inv.due_date)}). To change it later you'll void it and create a new one.`}
        confirmLabel="Issue invoice"
        onConfirm={() => run(() => invoicesApi.issue(inv.id), `${inv.invoice_number} issued`)}
      />
      <ConfirmDialog<{ reason: string }>
        open={confirm === "void"}
        onClose={() => setConfirm(null)}
        destructive
        title={`Void ${inv.invoice_number}?`}
        description="The invoice stays on record but no longer counts as owed. This can't be undone."
        confirmLabel="Void invoice"
        initialValues={{ reason: "" }}
        schema={reasonSchema}
        onConfirm={({ reason }) => run(() => invoicesApi.void(inv.id, reason), `${inv.invoice_number} voided`)}
      >
        <FormikTextField name="reason" label="Reason" placeholder="e.g. Billed the wrong customer" autoFocus />
      </ConfirmDialog>
      <ConfirmDialog
        open={confirm === "delete"}
        onClose={() => setConfirm(null)}
        destructive
        title={`Delete draft ${inv.invoice_number}?`}
        description="The draft is removed permanently."
        confirmLabel="Delete draft"
        onConfirm={async () => {
          try {
            await invoicesApi.remove(inv.id);
            router.push("/invoices");
          } catch (e) {
            setToast(applyApiError(e, () => {}) ?? "Could not delete");
          }
        }}
      />
      <ConfirmDialog<{ reason: string }>
        open={!!voidingPayment}
        onClose={() => setVoidingPayment(null)}
        destructive
        title={voidingPayment ? `Void ${usd(voidingPayment.amount)} payment?` : ""}
        description="Use this for a payment entered by mistake or a bounced check. The balance goes back up."
        confirmLabel="Void payment"
        initialValues={{ reason: "" }}
        schema={reasonSchema}
        onConfirm={({ reason }) => run(() => invoicesApi.voidPayment(inv.id, voidingPayment!.id, reason), "Payment voided")}
      >
        <FormikTextField name="reason" label="Reason" placeholder="e.g. Check bounced" autoFocus />
      </ConfirmDialog>

      <Snackbar open={!!toast} autoHideDuration={4500} onClose={() => setToast(null)} message={toast} />
    </>
  );
}

function PaymentRow({ p, last, canVoid, onVoid }: { p: InvoicePaymentDto; last: boolean; canVoid: boolean; onVoid: () => void }) {
  const voided = p.status === "cancelled";
  return (
    <Stack direction="row" gap={1.5} alignItems="flex-start" sx={{ px: 2.5, py: 1.5, borderBottom: last ? "none" : `1px solid ${tokens.divider}`, opacity: voided ? 0.6 : 1 }}>
      <Stack sx={{ flex: 1, minWidth: 0 }} gap={0.25}>
        <Stack direction="row" gap={1} alignItems="center">
          <Box sx={{ fontWeight: 600, textDecoration: voided ? "line-through" : "none", fontVariantNumeric: "tabular-nums" }}>{usd(p.amount)}</Box>
          {voided && <StatusTag tone="neutral">Voided</StatusTag>}
        </Stack>
        <Muted sx={{ fontSize: 12.5 }}>
          {fmtDate(p.paid_on)} · {p.method_label ?? (p.provider === "stripe" ? "Card (online)" : "—")}
          {p.reference ? ` · ${p.reference}` : ""}
        </Muted>
        {p.notes && <Muted sx={{ fontSize: 12.5, whiteSpace: "pre-wrap" }}>{p.notes}</Muted>}
        {p.recorded_by && <Muted sx={{ fontSize: 11.5 }}>Recorded by {p.recorded_by}</Muted>}
      </Stack>
      {canVoid && !voided && p.provider === "manual" && (
        <Button size="small" color="inherit" onClick={onVoid} sx={{ color: "text.secondary" }}>
          Void
        </Button>
      )}
    </Stack>
  );
}

function PaymentDrawer({ inv, onClose, onSaved }: { inv: InvoiceDetail; onClose: () => void; onSaved: (inv: InvoiceDetail) => void }) {
  const [methods, setMethods] = useState<MasterOption[]>([]);
  const key = useMemo(() => crypto.randomUUID(), []); // one key per open form → a double submit can't pay twice
  const balance = Number(inv.balance_due);

  useEffect(() => {
    onboardingApi.options("payment_method").then(setMethods).catch(() => setMethods([]));
  }, []);

  return (
    <FormDrawer open onClose={onClose} width={480}>
      <Formik
        initialValues={{ amount: inv.balance_due, paid_on: todayYmd(), method: "", reference: "", notes: "" }}
        validationSchema={Yup.object({
          amount: Yup.string()
            .trim()
            .required("Enter the amount.")
            .matches(/^\d{1,10}(\.\d{1,2})?$/, "Use a number like 250 or 250.50.")
            .test("pos", "Amount must be more than 0.", (v) => Number(v) > 0)
            .test("max", `Can't be more than the balance (${usd(balance)}).`, (v) => Number(v) <= balance),
          paid_on: Yup.string()
            .required("Choose the date.")
            .test("past", "Can't be in the future.", (v) => !v || v <= todayYmd()),
          method: Yup.string().required("Choose how it was paid."),
        })}
        onSubmit={async (v, { setStatus, setFieldError }) => {
          setStatus(null);
          try {
            onSaved(await invoicesApi.recordPayment(inv.id, { ...v, amount: v.amount.trim(), idempotency_key: key }));
          } catch (e) {
            setStatus(applyApiError(e, setFieldError));
          }
        }}
      >
        {({ isSubmitting, status, values }) => (
          <Form noValidate>
            <DialogTitle>Record payment</DialogTitle>
            <DialogContent>
              <Stack gap={2}>
                {status && <Alert severity="error">{status}</Alert>}
                <Box sx={{ p: 1.75, borderRadius: "10px", bgcolor: tokens.surfaceMuted, border: `1px solid ${tokens.border}` }}>
                  <KeyValue k={`${inv.invoice_number} · ${inv.customer.display_name}`} v="" />
                  <Box sx={{ mt: 0.75 }}>
                    <KeyValue k="Balance due" v={usd(inv.balance_due)} strong />
                  </Box>
                </Box>
                <FieldRow min={180}>
                  <FormikTextField
                    name="amount"
                    label="Amount"
                    inputMode="decimal"
                    autoFocus
                    InputProps={{ startAdornment: <Box sx={{ color: "text.secondary", mr: 0.5 }}>$</Box> }}
                    hint={Number(values.amount) && Number(values.amount) < balance ? `Leaves ${usd(balance - Number(values.amount))} due` : "Pays the invoice in full"}
                  />
                  <FormikTextField name="paid_on" label="Payment date" type="date" />
                </FieldRow>
                <FormikSelect name="method" label="Method" options={methods} />
                <FormikTextField name="reference" label="Reference" placeholder="Optional · check # or transaction ID" />
                <FormikTextField name="notes" label="Notes" placeholder="Optional" multiline minRows={2} />
                <Muted sx={{ fontSize: 12.5 }}>Use this for payments you received outside ContractorOS — cash, check or bank transfer.</Muted>
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={onClose}>Cancel</Button>
              <Button type="submit" variant="contained" color="primary" disabled={isSubmitting}>
                Record payment
              </Button>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </FormDrawer>
  );
}
