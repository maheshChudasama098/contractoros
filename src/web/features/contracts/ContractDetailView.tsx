"use client";

import EditOutlined from "@mui/icons-material/EditOutlined";
import HomeWorkOutlined from "@mui/icons-material/HomeWorkOutlined";
import MoreHorizOutlined from "@mui/icons-material/MoreHorizOutlined";
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
import { useCallback, useEffect, useState } from "react";
import { ConfirmDialog } from "@web/components/dialogs";
import { FieldRow, FormikTextField } from "@web/components/form";
import { DetailList, FormDrawer, Muted, PageHeader, SectionCard, SplitLayout, StatusTag } from "@web/components/ui";
import { Yup } from "@web/lib/validation";
import { tokens } from "@web/theme/tokens";
import { CONTRACT_STATUS_LABELS, type ContractDetail, type ContractDocument } from "@shared/contracts/proposals";
import { applyApiError } from "@web/features/customers/api";
import { todayYmd, usd } from "@web/features/invoices/api";
import { CONTRACT_TONE, contractsApi, fmtWhen } from "@web/features/estimates/api";
import { LinkDialog } from "@web/features/estimates/LinkDialog";
import { QuoteDocument, SignatureBlock } from "@web/features/estimates/QuoteDocument";

const EVENT_LABEL: Record<string, string> = {
  created: "Contract created",
  sent: "Sent for signature",
  viewed: "Opened by signer",
  signed: "Signed",
  declined: "Signer declined",
  expired: "Signing link closed",
  failed: "Signature failed",
  voided: "Voided",
};

/** The agreement as the customer sees and signs it. */
export function ContractDocumentView({
  doc,
  logoUrl,
  signed,
  signerName,
  stamp,
}: {
  doc: ContractDocument;
  logoUrl: string | null;
  signed: { signed_name: string; signed_at: string; signature_type: "typed" | "drawn"; signature_image: string | null } | null;
  signerName: string;
  stamp?: { text: string; color: string } | null;
}) {
  return (
    <QuoteDocument
      kind="Contract"
      number={doc.contract_number}
      logoUrl={logoUrl}
      from={doc.from}
      to={doc.customer}
      meta={[
        { k: "Estimate", v: `${doc.estimate.estimate_number} v${doc.estimate.version_number}` },
        { k: "Contract price", v: usd(doc.total), strong: true },
      ]}
      title={doc.title}
      intro={doc.estimate.scope_description}
      items={doc.items}
      totals={doc}
      sections={[{ heading: "Agreement", body: doc.body }]}
      stamp={stamp}
      footer={<SignatureBlock signed={signed} signerName={signerName} contractorName={doc.from.name} />}
    />
  );
}

export function ContractDetailView({ id }: { id: string }) {
  const router = useRouter();
  const [k, setK] = useState<ContractDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [projecting, setProjecting] = useState(false);
  const [confirm, setConfirm] = useState<"send" | "void" | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [menu, setMenu] = useState<HTMLElement | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(() => {
    contractsApi
      .get(id)
      .then((d) => (setK(d), setError(null)))
      .catch((e: Error) => setError(e.message));
  }, [id]);
  useEffect(load, [load]);

  if (!k) return error ? <Alert severity="error">{error}</Alert> : <CircularProgress sx={{ alignSelf: "center", mt: 6 }} />;
  const can = k.can;
  const sig = k.signature;

  return (
    <>
      <PageHeader
        eyebrow={
          <Link href="/contracts" style={{ color: "inherit" }}>
            Contracts
          </Link>
        }
        title={
          <Stack direction="row" alignItems="center" gap={1.5} flexWrap="wrap">
            {k.title}
            <StatusTag tone={CONTRACT_TONE[k.status]}>{CONTRACT_STATUS_LABELS[k.status]}</StatusTag>
          </Stack>
        }
        subtitle={
          <>
            {k.contract_number} · {k.customer.display_name} · {usd(k.contract_value)}
            {k.project && (
              <>
                {" · "}
                <Link href={`/projects/${k.project.id}`} style={{ color: "inherit" }}>
                  {k.project.project_number} {k.project.name}
                </Link>
              </>
            )}
          </>
        }
        actions={
          <Stack direction="row" gap={1} flexWrap="wrap">
            <Button variant="outlined" startIcon={<PrintOutlined />} component="a" href={`/contracts/${k.id}/print`} target="_blank" rel="noopener">
              Print / PDF
            </Button>
            {can.edit && (
              <Button variant="outlined" startIcon={<EditOutlined />} onClick={() => setEditing(true)}>
                Edit
              </Button>
            )}
            {can.send && (
              <Button variant="contained" color="primary" startIcon={<SendOutlined />} onClick={() => setConfirm("send")}>
                {k.status === "pending_signature" ? "Get new signing link" : "Send for signature"}
              </Button>
            )}
            {can.create_project && (
              <Button variant="contained" color="primary" startIcon={<HomeWorkOutlined />} onClick={() => setProjecting(true)}>
                Start project
              </Button>
            )}
            {k.project && (
              <Button variant="outlined" component={Link} href={`/projects/${k.project.id}`}>
                Open project
              </Button>
            )}
            {can.void && (
              <IconButton aria-label="More actions" onClick={(e) => setMenu(e.currentTarget)}>
                <MoreHorizOutlined />
              </IconButton>
            )}
          </Stack>
        }
      />

      {k.status === "draft" && (
        <Alert severity="info">Review the agreement text and who signs, then send it. The document is locked (and fingerprinted) as soon as it&apos;s sent.</Alert>
      )}
      {k.status === "pending_signature" && <Alert severity="warning">Waiting for {k.signer?.name} to sign. You sent it {fmtWhen(k.sent_at)}.</Alert>}
      {k.status === "signed" && !k.project && <Alert severity="success">Signed {fmtWhen(k.signed_at)}. Start the project to begin scheduling and invoicing.</Alert>}
      {k.status === "voided" && <Alert severity="warning">Voided {fmtWhen(k.voided_at)} — {k.void_reason}</Alert>}

      <SplitLayout
        main={
          <ContractDocumentView
            doc={k.document}
            logoUrl="/api/v1/onboarding/logo"
            signed={sig}
            signerName={k.signer?.name ?? k.customer.display_name}
            stamp={k.status === "signed" ? { text: "Signed", color: "#15803D" } : k.status === "voided" ? { text: "Void", color: "#6B7280" } : null}
          />
        }
        side={
          <>
            <SectionCard title="Signature" bodySx={{ p: 2.5 }}>
              {sig ? (
                <DetailList
                  items={[
                    { k: "Signed by", v: `${sig.signed_name} (${sig.signer_email})` },
                    { k: "When", v: fmtWhen(sig.signed_at) },
                    { k: "Method", v: sig.signature_type === "drawn" ? "Drawn signature" : "Typed name" },
                    { k: "IP address", v: sig.ip ?? "—" },
                    { k: "Document fingerprint", v: <Box sx={{ fontFamily: "monospace", fontSize: 11.5, wordBreak: "break-all" }}>{sig.document_hash}</Box> },
                  ]}
                />
              ) : (
                <Stack gap={1}>
                  <DetailList
                    items={[
                      { k: "Signer", v: k.signer ? `${k.signer.name} (${k.signer.email})` : "Not set" },
                      ...(k.document_hash ? [{ k: "Document fingerprint", v: <Box sx={{ fontFamily: "monospace", fontSize: 11.5, wordBreak: "break-all" }}>{k.document_hash}</Box> }] : []),
                    ]}
                  />
                  <Muted sx={{ fontSize: 12.5 }}>The signer gets a secure link, reviews the contract and signs by typing or drawing. Name, time, IP and the document fingerprint are kept as evidence.</Muted>
                </Stack>
              )}
            </SectionCard>

            <SectionCard title="Timeline" bodySx={{ p: 0 }}>
              {k.events.map((ev, i) => (
                <Stack key={i} gap={0.25} sx={{ px: 2.5, py: 1.25, borderBottom: i === k.events.length - 1 ? "none" : `1px solid ${tokens.divider}` }}>
                  <Box sx={{ fontSize: 13.5, fontWeight: 500 }}>{EVENT_LABEL[ev.type] ?? ev.type}</Box>
                  <Muted sx={{ fontSize: 12 }}>
                    {fmtWhen(ev.at)}
                    {ev.detail ? ` · ${ev.detail}` : ""}
                  </Muted>
                </Stack>
              ))}
            </SectionCard>

            <SectionCard title="Linked" bodySx={{ p: 2.5 }}>
              <DetailList
                items={[
                  { k: "Estimate", v: k.estimate ? <Link href={`/estimates/${k.estimate.id}`}>{`${k.estimate.estimate_number} v${k.estimate.version_number}`}</Link> : "—" },
                  { k: "Proposal", v: k.proposal?.proposal_number ?? "—" },
                  { k: "Project", v: k.project ? <Link href={`/projects/${k.project.id}`}>{k.project.project_number}</Link> : "Not started" },
                ]}
              />
            </SectionCard>
          </>
        }
      />

      <Menu anchorEl={menu} open={!!menu} onClose={() => setMenu(null)}>
        <MenuItem sx={{ color: "error.main" }} onClick={() => (setMenu(null), setConfirm("void"))}>
          Void contract
        </MenuItem>
      </Menu>

      {editing && <EditDrawer k={k} onClose={() => setEditing(false)} onSaved={(next) => (setEditing(false), setK(next), setToast("Contract saved"))} />}
      {projecting && (
        <ProjectDrawer
          k={k}
          onClose={() => setProjecting(false)}
          onCreated={(projectId) => (setProjecting(false), router.push(`/projects/${projectId}`))}
        />
      )}
      {link && (
        <LinkDialog
          title="Signing link ready"
          body={`Send this link to ${k.signer?.name ?? "the signer"}. They'll review the contract and sign online — no login needed.`}
          url={link}
          onClose={() => setLink(null)}
        />
      )}

      <ConfirmDialog
        open={confirm === "send"}
        onClose={() => setConfirm(null)}
        title={k.status === "pending_signature" ? "Create a new signing link?" : `Send ${k.contract_number} for signature?`}
        description={
          k.status === "pending_signature"
            ? "The previous link stops working. The document stays the same."
            : `The agreement is locked and fingerprinted, and you'll get a link for ${k.signer?.name ?? "the signer"} (valid 14 days).`
        }
        confirmLabel={k.status === "pending_signature" ? "Create new link" : "Lock & create link"}
        onConfirm={async () => {
          try {
            const r = await contractsApi.send(k.id);
            setK(r.contract);
            setLink(r.url);
          } catch (e) {
            setToast(applyApiError(e, () => {}) ?? "Could not send");
          }
        }}
      />
      <ConfirmDialog<{ reason: string }>
        open={confirm === "void"}
        onClose={() => setConfirm(null)}
        destructive
        title={`Void ${k.contract_number}?`}
        description={k.status === "signed" ? "The signed record is kept for evidence, but the contract no longer applies." : "Any open signing link stops working."}
        confirmLabel="Void contract"
        initialValues={{ reason: "" }}
        schema={Yup.object({ reason: Yup.string().trim().min(3, "Give a short reason.").required("Give a short reason.") })}
        onConfirm={async ({ reason }) => {
          try {
            setK(await contractsApi.void(k.id, reason));
            setToast("Contract voided");
          } catch (e) {
            setToast(applyApiError(e, () => {}) ?? "Could not void");
          }
        }}
      >
        <FormikTextField name="reason" label="Reason" placeholder="e.g. Customer cancelled the job" autoFocus />
      </ConfirmDialog>
      <Snackbar open={!!toast} autoHideDuration={4500} onClose={() => setToast(null)} message={toast} />
    </>
  );
}

function EditDrawer({ k, onClose, onSaved }: { k: ContractDetail; onClose: () => void; onSaved: (k: ContractDetail) => void }) {
  return (
    <FormDrawer open onClose={onClose} width={760}>
      <Formik
        initialValues={{ title: k.title, body: k.body, signer_name: k.signer?.name ?? "", signer_email: k.signer?.email ?? "" }}
        validationSchema={Yup.object({
          title: Yup.string().trim().required("Give the contract a title."),
          body: Yup.string().trim().min(20, "Add the agreement text.").required("Add the agreement text."),
          signer_name: Yup.string().trim().required("Who signs for the customer?"),
          signer_email: Yup.string().trim().email("Enter a valid email.").required("Enter the signer's email."),
        })}
        onSubmit={async (v, { setStatus, setFieldError }) => {
          setStatus(null);
          try {
            onSaved(await contractsApi.update(k.id, v));
          } catch (e) {
            setStatus(applyApiError(e, setFieldError));
          }
        }}
      >
        {({ isSubmitting, status }) => (
          <Form noValidate>
            <DialogTitle>Edit {k.contract_number}</DialogTitle>
            <DialogContent>
              <Stack gap={2}>
                {status && <Alert severity="error">{status}</Alert>}
                <FormikTextField name="title" label="Title" />
                <FieldRow min={240}>
                  <FormikTextField name="signer_name" label="Signer name" />
                  <FormikTextField name="signer_email" label="Signer email" type="email" />
                </FieldRow>
                <FormikTextField
                  name="body"
                  label="Agreement text"
                  multiline
                  minRows={16}
                  hint="Starter terms are filled in for you — adjust them to your business. Have a lawyer review your standard contract."
                />
                <Muted sx={{ fontSize: 12.5 }}>Price and line items come from the accepted estimate and can&apos;t be changed here.</Muted>
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={onClose}>Cancel</Button>
              <Button type="submit" variant="contained" color="primary" disabled={isSubmitting}>
                Save changes
              </Button>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </FormDrawer>
  );
}

function ProjectDrawer({ k, onClose, onCreated }: { k: ContractDetail; onClose: () => void; onCreated: (projectId: string) => void }) {
  const s = k.site_suggestion;
  return (
    <FormDrawer open onClose={onClose} width={520}>
      <Formik
        initialValues={{
          name: k.title,
          site_address_line1: s?.address_line1 ?? "",
          site_address_line2: s?.address_line2 ?? "",
          site_city: s?.city ?? "",
          site_state: s?.state ?? "",
          site_postal_code: s?.postal_code ?? "",
          planned_start_date: "",
        }}
        validationSchema={Yup.object({
          name: Yup.string().trim().required("Project name is required."),
          site_address_line1: Yup.string().trim().required("Job site address is required."),
          site_city: Yup.string().trim().required("City is required."),
          site_state: Yup.string().trim().required("State is required."),
          site_postal_code: Yup.string().trim().required("ZIP code is required."),
        })}
        onSubmit={async (v, { setStatus, setFieldError }) => {
          setStatus(null);
          try {
            onCreated((await contractsApi.createProject(k.id, v)).project_id);
          } catch (e) {
            setStatus(applyApiError(e, setFieldError));
          }
        }}
      >
        {({ isSubmitting, status }) => (
          <Form noValidate>
            <DialogTitle>Start project</DialogTitle>
            <DialogContent>
              <Stack gap={2}>
                {status && <Alert severity="error">{status}</Alert>}
                <Muted sx={{ fontSize: 13.5 }}>
                  Creates the project for {k.customer.display_name} with the contract price ({usd(k.contract_value)}).
                </Muted>
                <FormikTextField name="name" label="Project name" />
                <FormikTextField name="site_address_line1" label="Job site address" hint={s ? "Copied from the customer's billing address." : undefined} />
                <FormikTextField name="site_address_line2" label="Suite / unit" placeholder="Optional" />
                <FieldRow min={140}>
                  <FormikTextField name="site_city" label="City" />
                  <FormikTextField name="site_state" label="State" />
                  <FormikTextField name="site_postal_code" label="ZIP" />
                </FieldRow>
                <FormikTextField name="planned_start_date" label="Planned start" type="date" inputProps={{ min: todayYmd() }} />
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={onClose}>Cancel</Button>
              <Button type="submit" variant="contained" color="primary" disabled={isSubmitting}>
                Create project
              </Button>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </FormDrawer>
  );
}

