"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import { Form, Formik, type FormikValues } from "formik";
import type { ReactNode } from "react";
import type { AnyObject, ObjectSchema } from "yup";
import { FormikCheckbox, FormikSelect, FormikTextField } from "@web/components/form";
import { KeyValue, Muted, Num } from "@web/components/ui";
import { Yup } from "@web/lib/validation";
import { tokens } from "@web/theme/tokens";

/**
 * Confirmation for financial & destructive actions: says what will happen,
 * collects any required input with Formik, and only then confirms.
 */
export function ConfirmDialog<V extends FormikValues>({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  destructive,
  initialValues,
  schema,
  children,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (values: V) => void | Promise<void>;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel: ReactNode | ((v: V) => ReactNode);
  cancelLabel?: string;
  destructive?: boolean;
  initialValues?: V;
  schema?: ObjectSchema<AnyObject>;
  children?: ReactNode;
}) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <Formik<V>
        initialValues={initialValues ?? ({} as V)}
        validationSchema={schema}
        enableReinitialize
        onSubmit={async (v) => {
          await onConfirm(v);
          onClose();
        }}
      >
        {({ values, isSubmitting }) => (
          <Form noValidate>
            <DialogTitle>{title}</DialogTitle>
            <DialogContent>
              <Stack gap={2}>
                {description && <Muted sx={{ fontSize: 13.5 }}>{description}</Muted>}
                {children}
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={onClose}>{cancelLabel}</Button>
              <Button type="submit" variant="contained" color={destructive ? "error" : "primary"} disabled={isSubmitting}>
                {typeof confirmLabel === "function" ? confirmLabel(values) : confirmLabel}
              </Button>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </Dialog>
  );
}

export function SummaryBox({ rows }: { rows: [ReactNode, ReactNode][] }) {
  return (
    <Stack gap={1} sx={{ p: 1.5, borderRadius: "10px", border: `1px solid ${tokens.border}`, bgcolor: tokens.surfaceMuted }}>
      {rows.map(([k, v], i) => (
        <KeyValue key={i} k={k} v={v} />
      ))}
    </Stack>
  );
}

type Open = { open: boolean; onClose: () => void; onConfirm?: () => void };

export function RefundDialog({ open, onClose, onConfirm, refundable = 15000 }: Open & { refundable?: number }) {
  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={() => onConfirm?.()}
      destructive
      title="Refund payment"
      description="ACH ••6620 · Oct 27 · INV-3108"
      initialValues={{ amount: "", reason: "Overpayment" }}
      schema={Yup.object({
        amount: Yup.number().typeError("Enter an amount.").moreThan(0, "Enter more than $0.").max(refundable, `Can't exceed $${refundable.toLocaleString()}.00.`).required("Enter an amount."),
        reason: Yup.string().required(),
      })}
      confirmLabel={(v) => `Refund ${v.amount ? `$${Number(v.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}` : ""}`.trim()}
    >
      <SummaryBox rows={[["Refundable", <Num key="r">{`$${refundable.toLocaleString()}.00`}</Num>]]} />
      <FormikTextField name="amount" label="Amount" inputMode="decimal" hint={`Can't exceed $${refundable.toLocaleString()}.00.`} slotProps={{ input: { startAdornment: <Box sx={{ color: "text.secondary", pl: 1.5 }}>$</Box> } }} />
      <FormikSelect name="reason" label="Reason" options={["Overpayment", "Scope reduced", "Duplicate payment"]} />
      <Muted sx={{ fontSize: 13 }}>Sent to Stripe now. The invoice balance updates once Stripe confirms the refund.</Muted>
    </ConfirmDialog>
  );
}

export function VoidContractDialog({ open, onClose, onConfirm }: Open) {
  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={() => onConfirm?.()}
      destructive
      title="Void contract CT-0188?"
      description="The signing request is cancelled and the contract is kept on record as void. This can't be undone."
      initialValues={{ reason: "", notify: true }}
      schema={Yup.object({ reason: Yup.string().trim().min(10, "Give a short reason (10+ characters).").required("A reason is required.") })}
      cancelLabel="Keep contract"
      confirmLabel="Void contract"
    >
      <FormikTextField name="reason" label="Reason (required)" multiline minRows={3} placeholder="Customer requested a revised scope — reissuing from EST-2079 v3." />
      <FormikCheckbox name="notify" label="Email Sofia Marquez that this contract was withdrawn" />
    </ConfirmDialog>
  );
}

export function CreateProjectDialog({ open, onClose, onConfirm }: Open) {
  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={() => onConfirm?.()}
      title="Create Marquez Kitchen Remodel"
      description="We'll link everything from the signed contract. A project is only ever created once per contract."
      initialValues={{ pm: "Marcus Bell" }}
      schema={Yup.object({ pm: Yup.string().required("Choose a project manager.") })}
      confirmLabel="Create project"
    >
      <SummaryBox
        rows={[
          ["Customer & property", "Sofia Marquez · 2504 Kinney Ave"],
          ["Contract value", <Num key="v">$93,140.00</Num>],
          ["Payment schedule", "4 milestones"],
        ]}
      />
      <FormikSelect name="pm" label="Project manager" options={["Marcus Bell", "Tomás Reyes", "Dana Ruiz"]} />
    </ConfirmDialog>
  );
}

export function RevokePortalDialog({ open, onClose, onConfirm }: Open) {
  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={() => onConfirm?.()}
      destructive
      title="Revoke the portal link?"
      description="Anyone using the current link for Shah Kitchen Remodel will see a “link not available” page right away."
      initialValues={{ reissue: true }}
      confirmLabel="Revoke link"
    >
      <FormikCheckbox
        name="reissue"
        label={
          <span>
            <strong>Create a new link</strong> and email it to priya.shah@gmail.com
          </span>
        }
      />
    </ConfirmDialog>
  );
}

export function RemoveMemberDialog({ open, onClose, onConfirm, name = "Sam Whitfield" }: Open & { name?: string }) {
  const first = name.split(" ")[0];
  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={() => onConfirm?.()}
      destructive
      title={`Remove ${name}?`}
      description={`${first} loses access to Harbor & Pine immediately. Their leads, notes and history stay in place.`}
      initialValues={{ reassign: "Lena Ortiz" }}
      schema={Yup.object({ reassign: Yup.string().required("Choose who takes over.") })}
      confirmLabel="Remove member"
    >
      <FormikSelect name="reassign" label={`Reassign ${first}'s 3 open leads to`} options={["Lena Ortiz", "Dana Ruiz"]} />
    </ConfirmDialog>
  );
}
