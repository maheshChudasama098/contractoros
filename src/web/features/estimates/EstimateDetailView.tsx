"use client";

import ContentCopyOutlined from "@mui/icons-material/ContentCopyOutlined";
import EditOutlined from "@mui/icons-material/EditOutlined";
import HistoryOutlined from "@mui/icons-material/HistoryOutlined";
import MoreHorizOutlined from "@mui/icons-material/MoreHorizOutlined";
import PrintOutlined from "@mui/icons-material/PrintOutlined";
import SendOutlined from "@mui/icons-material/SendOutlined";
import TaskAltOutlined from "@mui/icons-material/TaskAltOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ConfirmDialog } from "@web/components/dialogs";
import { FormikSelect, FormikTextField } from "@web/components/form";
import { DetailList, KeyValue, Muted, PageHeader, SectionCard, SplitLayout, StatusTag } from "@web/components/ui";
import { tokens } from "@web/theme/tokens";
import { ESTIMATE_STATUS_LABELS, type EstimateDetail, type ProposalSummary } from "@shared/contracts/estimates";
import { PROPOSAL_STATUS_LABELS } from "@shared/contracts/proposals";
import { applyApiError } from "@web/features/customers/api";
import { usd } from "@web/features/invoices/api";
import { ESTIMATE_TONE, PROPOSAL_TONE, estimatesApi, fmtDay, fmtWhen, proposalsApi } from "./api";
import { EstimateDrawer } from "./EstimateDrawer";
import { LinkDialog } from "./LinkDialog";
import { QuoteDocument } from "./QuoteDocument";

export function EstimateDocument({ e }: { e: EstimateDetail }) {
  const v = e.version;
  return (
    <QuoteDocument
      kind="Estimate"
      number={`${e.estimate_number}${e.versions.length > 1 ? ` · v${v.version_number}` : ""}`}
      logoUrl={e.from.has_logo ? "/api/v1/onboarding/logo" : null}
      from={e.from}
      to={e.bill_to}
      meta={[
        { k: "Date", v: fmtDay(v.issued_at ?? v.created_at) },
        ...(v.valid_until ? [{ k: "Valid until", v: fmtDay(v.valid_until) }] : []),
        { k: "Total", v: usd(v.total), strong: true },
      ]}
      title={v.title}
      intro={v.scope_description}
      items={v.items}
      totals={v}
      sections={[
        { heading: "Notes", body: v.customer_notes },
        { heading: "Terms", body: v.terms, muted: true },
      ]}
      stamp={e.status === "accepted" ? { text: "Accepted", color: "#15803D" } : e.status === "declined" ? { text: "Declined", color: "#B91C1C" } : null}
    />
  );
}

export function EstimateDetailView({ id }: { id: string }) {
  const router = useRouter();
  const [e, setE] = useState<EstimateDetail | null>(null);
  const [versionId, setVersionId] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState<"issue" | "delete" | "discard" | "send" | null>(null);
  const [withdrawing, setWithdrawing] = useState<ProposalSummary | null>(null);
  const [link, setLink] = useState<{ title: string; url: string } | null>(null);
  const [menu, setMenu] = useState<HTMLElement | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(() => {
    estimatesApi
      .get(id, versionId)
      .then((d) => (setE(d), setError(null)))
      .catch((err: Error) => setError(err.message));
  }, [id, versionId]);
  useEffect(load, [load]);

  const run = async (fn: () => Promise<EstimateDetail | void>, ok: string) => {
    try {
      const next = await fn();
      if (next) (setVersionId(undefined), setE(next));
      setToast(ok);
    } catch (err) {
      setToast(applyApiError(err, () => {}) ?? "Something went wrong");
    }
  };

  if (!e) return error ? <Alert severity="error">{error}</Alert> : <CircularProgress sx={{ alignSelf: "center", mt: 6 }} />;

  const can = e.can;
  const latest = e.versions[0]!;
  const viewingOld = e.version.id !== latest.id;
  const internal = e.version.internal;
  const openProposal = e.proposals.find((p) => p.status === "sent");

  return (
    <>
      <PageHeader
        eyebrow={
          <Link href="/estimates" style={{ color: "inherit" }}>
            Estimates
          </Link>
        }
        title={
          <Stack direction="row" alignItems="center" gap={1.5} flexWrap="wrap">
            {e.title}
            <StatusTag tone={ESTIMATE_TONE[e.status]}>{ESTIMATE_STATUS_LABELS[e.status]}</StatusTag>
            {e.has_draft && e.status !== "draft" && (
              <StatusTag tone="neutral" dot={false}>
                Revising v{latest.version_number}
              </StatusTag>
            )}
          </Stack>
        }
        subtitle={
          <>
            {e.estimate_number} · {e.customer.display_name}
            {e.project && (
              <>
                {" · "}
                <Link href={`/projects/${e.project.id}`} style={{ color: "inherit" }}>
                  {e.project.project_number} {e.project.name}
                </Link>
              </>
            )}
          </>
        }
        actions={
          <Stack direction="row" gap={1} flexWrap="wrap">
            <Button variant="outlined" startIcon={<PrintOutlined />} component="a" href={`/estimates/${e.id}/print${viewingOld ? `?version=${e.version.id}` : ""}`} target="_blank" rel="noopener">
              Print / PDF
            </Button>
            {can.edit && (
              <Button variant="outlined" startIcon={<EditOutlined />} onClick={() => (setVersionId(undefined), setEditing(true))}>
                Edit
              </Button>
            )}
            {can.issue && (
              <Button variant="contained" color="primary" startIcon={<TaskAltOutlined />} onClick={() => setConfirm("issue")}>
                Issue v{latest.version_number}
              </Button>
            )}
            {can.send_proposal && (
              <Button variant="contained" color="primary" startIcon={<SendOutlined />} onClick={() => setConfirm("send")}>
                Send proposal
              </Button>
            )}
            {can.revise && (
              <Button variant="outlined" startIcon={<HistoryOutlined />} onClick={() => run(() => estimatesApi.revise(e.id), `Version ${latest.version_number + 1} started`)}>
                New version
              </Button>
            )}
            {(can.delete || (e.has_draft && e.versions.length > 1)) && (
              <IconButton aria-label="More actions" onClick={(ev) => setMenu(ev.currentTarget)}>
                <MoreHorizOutlined />
              </IconButton>
            )}
          </Stack>
        }
      />

      {e.status === "draft" && <Alert severity="info">Draft — customers can&apos;t see it yet. Issue it to lock this version, then send it as a proposal.</Alert>}
      {e.has_draft && e.status !== "draft" && !viewingOld && (
        <Alert severity="info">
          You&apos;re editing version {latest.version_number}. Version {latest.version_number - 1} stays valid for the customer until you issue this one — issuing withdraws older proposals.
        </Alert>
      )}
      {e.status === "expired" && <Alert severity="warning">This estimate passed its valid-until date. Start a new version to update prices and dates.</Alert>}
      {viewingOld && (
        <Alert severity="warning" action={<Button onClick={() => setVersionId(undefined)}>Show latest</Button>}>
          You&apos;re viewing version {e.version.version_number} (read only).
        </Alert>
      )}

      <SplitLayout
        main={<EstimateDocument e={e} />}
        side={
          <>
            {internal !== undefined && (
              <SectionCard title="Margin · internal" bodySx={{ p: 2.5 }}>
                {internal ? (
                  <Stack gap={1.25}>
                    <KeyValue k="Price (before tax)" v={usd(Number(e.version.subtotal) - Number(e.version.discount_total))} />
                    <KeyValue k="Your cost" v={usd(internal.cost_total)} />
                    <Box sx={{ borderTop: `1px solid ${tokens.border}`, pt: 1.25 }}>
                      <KeyValue
                        k="Margin"
                        v={
                          <Box component="span" sx={{ color: Number(internal.margin) < 0 ? "error.main" : "success.main" }}>
                            {usd(internal.margin)}
                            {internal.margin_pct != null ? ` · ${internal.margin_pct}%` : ""}
                          </Box>
                        }
                        strong
                      />
                    </Box>
                    <Muted sx={{ fontSize: 12 }}>Only people with the “internal cost” permission see this. It&apos;s never on the customer&apos;s copy.</Muted>
                  </Stack>
                ) : (
                  <Muted sx={{ fontSize: 13.5 }}>Add “your cost” to line items to see the margin.</Muted>
                )}
              </SectionCard>
            )}

            <SectionCard title="Proposals" bodySx={{ p: e.proposals.length ? 0 : 2.5 }}>
              {e.proposals.length === 0 ? (
                <Muted sx={{ fontSize: 13.5 }}>
                  {e.status === "draft" ? "Issue the estimate, then send it to the customer to accept online." : "Not sent yet."}
                </Muted>
              ) : (
                e.proposals.map((p, i) => (
                  <Stack key={p.id} gap={0.5} sx={{ px: 2.5, py: 1.5, borderBottom: i === e.proposals.length - 1 ? "none" : `1px solid ${tokens.divider}` }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
                      <Box sx={{ fontWeight: 600 }}>
                        {p.proposal_number} <Muted component="span">· v{p.version_number}</Muted>
                      </Box>
                      <StatusTag tone={PROPOSAL_TONE[p.status]}>{PROPOSAL_STATUS_LABELS[p.status]}</StatusTag>
                    </Stack>
                    <Muted sx={{ fontSize: 12.5 }}>
                      {p.status === "accepted"
                        ? `Accepted by ${p.accepted_by_name} · ${fmtWhen(p.accepted_at)}`
                        : p.status === "declined"
                          ? `Declined ${fmtWhen(p.declined_at)}${p.decline_reason ? ` — “${p.decline_reason}”` : ""}`
                          : `Sent ${fmtWhen(p.sent_at)}${p.expires_at ? ` · expires ${fmtDay(p.expires_at)}` : ""}${p.viewed_at ? " · opened" : " · not opened yet"}`}
                    </Muted>
                    {(p.status === "sent" || p.status === "expired") && (can.revise || can.send_proposal) && (
                      <Stack direction="row" gap={1} sx={{ mt: 0.5 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<ContentCopyOutlined />}
                          onClick={async () => {
                            try {
                              const r = await proposalsApi.renewLink(p.id);
                              setLink({ title: `New link for ${r.proposal.proposal_number}`, url: r.url });
                              load();
                            } catch (err) {
                              setToast(applyApiError(err, () => {}) ?? "Could not create a link");
                            }
                          }}
                        >
                          {p.status === "expired" ? "Reopen with new link" : "Get new link"}
                        </Button>
                        {p.status === "sent" && (
                          <Button size="small" color="inherit" onClick={() => setWithdrawing(p)} sx={{ color: "text.secondary" }}>
                            Withdraw
                          </Button>
                        )}
                      </Stack>
                    )}
                    {p.contract_id && (
                      <Button size="small" component={Link} href={`/contracts/${p.contract_id}`} sx={{ alignSelf: "flex-start", px: 0 }}>
                        Open contract →
                      </Button>
                    )}
                  </Stack>
                ))
              )}
            </SectionCard>

            <SectionCard title="Versions" bodySx={{ p: 0 }}>
              {e.versions.map((v, i) => (
                <Stack
                  key={v.id}
                  direction="row"
                  alignItems="center"
                  gap={1}
                  onClick={() => setVersionId(i === 0 ? undefined : v.id)}
                  sx={{
                    px: 2.5,
                    py: 1.25,
                    cursor: "pointer",
                    bgcolor: v.id === e.version.id ? tokens.brandSoft : "transparent",
                    borderBottom: i === e.versions.length - 1 ? "none" : `1px solid ${tokens.divider}`,
                    "&:hover": { bgcolor: v.id === e.version.id ? tokens.brandSoft : tokens.surfaceMuted },
                  }}
                >
                  <Box sx={{ fontWeight: 600, minWidth: 28 }}>v{v.version_number}</Box>
                  <Muted sx={{ flex: 1, fontSize: 12.5 }}>{v.issued_at ? `Issued ${fmtDay(v.issued_at)}` : "Draft"}</Muted>
                  <Box sx={{ fontVariantNumeric: "tabular-nums", fontSize: 13.5 }}>{usd(v.total)}</Box>
                </Stack>
              ))}
            </SectionCard>

            <SectionCard title="Details" bodySx={{ p: 2.5 }}>
              <DetailList
                items={[
                  { k: "Customer", v: e.customer.display_name },
                  { k: "Created", v: fmtDay(e.created_at) },
                  { k: "Valid until", v: fmtDay(e.version.valid_until) },
                  { k: "Tax rate", v: `${e.version.tax_rate}%` },
                ]}
              />
            </SectionCard>
          </>
        }
      />

      <Menu anchorEl={menu} open={!!menu} onClose={() => setMenu(null)}>
        {e.has_draft && e.versions.length > 1 && <MenuItem onClick={() => (setMenu(null), setConfirm("discard"))}>Discard v{latest.version_number} draft</MenuItem>}
        {can.delete && (
          <MenuItem sx={{ color: "error.main" }} onClick={() => (setMenu(null), setConfirm("delete"))}>
            Delete estimate
          </MenuItem>
        )}
      </Menu>

      {editing && (
        <EstimateDrawer
          estimate={e}
          canCost={can.view_internal_cost}
          onClose={() => setEditing(false)}
          onSaved={(next) => (setEditing(false), setE(next), setToast("Estimate saved"))}
        />
      )}
      {link && (
        <LinkDialog
          title={link.title}
          body="Send this link to your customer. They can review the estimate and accept or decline it online — no login needed."
          url={link.url}
          onClose={() => setLink(null)}
        />
      )}

      <ConfirmDialog
        open={confirm === "issue"}
        onClose={() => setConfirm(null)}
        title={`Issue version ${latest.version_number}?`}
        description={`The prices and items are locked (total ${usd(latest.total)}). Later changes go into a new version.${e.proposals.some((p) => p.status === "sent") ? " Open proposals for older versions will be withdrawn." : ""}`}
        confirmLabel="Issue"
        onConfirm={() => run(() => estimatesApi.issue(e.id), `Version ${latest.version_number} issued`)}
      />
      <ConfirmDialog<{ message: string; expires_in_days: string }>
        open={confirm === "send"}
        onClose={() => setConfirm(null)}
        title={`Send ${e.estimate_number} as a proposal`}
        description="You'll get a secure link for the customer to review and accept online."
        confirmLabel="Create link"
        initialValues={{ message: "", expires_in_days: "30" }}
        onConfirm={async (vals) => {
          try {
            const r = await estimatesApi.sendProposal(e.id, { message: vals.message || null, expires_in_days: Number(vals.expires_in_days) });
            setLink({ title: `${r.proposal.proposal_number} is ready to send`, url: r.url });
            load();
          } catch (err) {
            setToast(applyApiError(err, () => {}) ?? "Could not send");
          }
        }}
      >
        <Stack gap={2}>
          <FormikTextField name="message" label="Message to customer" placeholder="Optional · e.g. Thanks for having us out…" multiline minRows={3} />
          <FormikSelect
            name="expires_in_days"
            label="Link expires after"
            options={[
              { value: "7", label: "7 days" },
              { value: "14", label: "14 days" },
              { value: "30", label: "30 days" },
              { value: "60", label: "60 days" },
            ]}
          />
        </Stack>
      </ConfirmDialog>
      <ConfirmDialog
        open={!!withdrawing}
        onClose={() => setWithdrawing(null)}
        destructive
        title={`Withdraw ${withdrawing?.proposal_number}?`}
        description="The customer's link stops working and they can no longer accept it."
        confirmLabel="Withdraw"
        onConfirm={async () => {
          try {
            await proposalsApi.withdraw(withdrawing!.id);
            setToast("Proposal withdrawn");
            load();
          } catch (err) {
            setToast(applyApiError(err, () => {}) ?? "Could not withdraw");
          }
        }}
      />
      <ConfirmDialog
        open={confirm === "discard"}
        onClose={() => setConfirm(null)}
        destructive
        title={`Discard version ${latest.version_number}?`}
        description={`Your changes in the draft are removed. Version ${latest.version_number - 1} stays as it is.`}
        confirmLabel="Discard draft"
        onConfirm={() => run(() => estimatesApi.discardDraft(e.id), "Draft discarded")}
      />
      <ConfirmDialog
        open={confirm === "delete"}
        onClose={() => setConfirm(null)}
        destructive
        title={`Delete ${e.estimate_number}?`}
        description="The draft estimate is removed permanently."
        confirmLabel="Delete"
        onConfirm={async () => {
          try {
            await estimatesApi.remove(e.id);
            router.push("/estimates");
          } catch (err) {
            setToast(applyApiError(err, () => {}) ?? "Could not delete");
          }
        }}
      />
      <Snackbar open={!!toast} autoHideDuration={4500} onClose={() => setToast(null)} message={toast} />
    </>
  );
}
