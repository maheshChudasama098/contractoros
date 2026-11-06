"use client";

import AddLinkOutlined from "@mui/icons-material/AddLinkOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Form, Formik } from "formik";
import { useCallback, useEffect, useState } from "react";
import { ConfirmDialog } from "@web/components/dialogs";
import { FormikCheckbox, FormikSelect, FormikTextField } from "@web/components/form";
import { FormDrawer, Muted, StatusTag } from "@web/components/ui";
import { api } from "@web/lib/api-client";
import { Yup } from "@web/lib/validation";
import { tokens } from "@web/theme/tokens";
import type { CreateShareLinkInput, NewShareLink, ShareLinkDto } from "@shared/contracts/project-share";
import { applyApiError } from "@web/features/customers/api";
import { LinkDialog } from "@web/features/estimates/LinkDialog";
import { fmtDay, fmtWhen } from "@web/features/estimates/api";

const shareApi = (projectId: string) => ({
  list: () => api<ShareLinkDto[]>(`/projects/${projectId}/share-links`),
  create: (input: CreateShareLinkInput) => api<NewShareLink>(`/projects/${projectId}/share-links`, { method: "POST", body: JSON.stringify(input) }),
  revoke: (id: string) => api<ShareLinkDto>(`/projects/${projectId}/share-links/${id}/revoke`, { method: "POST", body: "{}" }),
});

const STATUS = { active: { tone: "success", label: "Active" }, expired: { tone: "warning", label: "Expired" }, revoked: { tone: "neutral", label: "Turned off" } } as const;

/** Create and manage login-free links to this project. */
export function ShareDrawer({ projectId, projectName, onClose }: { projectId: string; projectName: string; onClose: () => void }) {
  const sa = shareApi(projectId);
  const [links, setLinks] = useState<ShareLinkDto[] | null>(null);
  const [newUrl, setNewUrl] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<ShareLinkDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    shareApi(projectId).list().then(setLinks).catch((e: Error) => setError(e.message));
  }, [projectId]);
  useEffect(load, [load]);

  return (
    <FormDrawer open onClose={onClose} width={560}>
      <DialogTitle>Share project</DialogTitle>
      <DialogContent>
        <Stack gap={3}>
          <Muted sx={{ fontSize: 13.5 }}>
            Anyone with a link can open <b>{projectName}</b> without logging in and see every tab — overview, tasks, schedule, budget, files and activity.
            Everything is read-only, except that (if you allow it) they can add tasks and update them. They can&apos;t delete anything.
          </Muted>
          {error && <Alert severity="error">{error}</Alert>}

          <Formik<{ label: string; expires_in_days: string; allow_tasks: boolean }>
            initialValues={{ label: "", expires_in_days: "0", allow_tasks: true }}
            validationSchema={Yup.object({ label: Yup.string().trim().required("Who is this link for?").max(120) })}
            onSubmit={async (v, { setStatus, setFieldError, resetForm }) => {
              setStatus(null);
              try {
                const r = await sa.create({ label: v.label.trim(), expires_in_days: Number(v.expires_in_days), allow_tasks: v.allow_tasks });
                resetForm();
                setNewUrl(r.url);
                load();
              } catch (e) {
                setStatus(applyApiError(e, setFieldError));
              }
            }}
          >
            {({ isSubmitting, status }) => (
              <Stack component={Form} noValidate gap={2} sx={{ p: 2, borderRadius: "10px", border: `1px solid ${tokens.border}`, bgcolor: tokens.surfaceMuted }}>
                <Typography variant="h3">New link</Typography>
                {status && <Alert severity="error">{status}</Alert>}
                <FormikTextField name="label" label="Who is it for?" placeholder="e.g. Homeowner, Tile crew, Architect" />
                <FormikSelect
                  name="expires_in_days"
                  label="Link works for"
                  options={[
                    { value: "0", label: "Until I turn it off" },
                    { value: "7", label: "7 days" },
                    { value: "30", label: "30 days" },
                    { value: "90", label: "90 days" },
                  ]}
                />
                <FormikCheckbox name="allow_tasks" label="Allow adding and updating tasks" />
                <Box>
                  <Button type="submit" variant="contained" color="primary" startIcon={<AddLinkOutlined />} disabled={isSubmitting}>
                    Create link
                  </Button>
                </Box>
              </Stack>
            )}
          </Formik>

          <Stack gap={1}>
            <Typography variant="h3">Links</Typography>
            {links && links.length === 0 && <Muted sx={{ fontSize: 13.5 }}>No links yet.</Muted>}
            {(links ?? []).map((l) => (
              <Stack key={l.id} direction="row" gap={1.5} alignItems="flex-start" sx={{ py: 1.25, borderBottom: `1px solid ${tokens.divider}`, opacity: l.status === "active" ? 1 : 0.65 }}>
                <Stack sx={{ flex: 1, minWidth: 0 }} gap={0.25}>
                  <Stack direction="row" gap={1} alignItems="center">
                    <Box sx={{ fontWeight: 600 }}>{l.label}</Box>
                    <StatusTag tone={STATUS[l.status].tone}>{STATUS[l.status].label}</StatusTag>
                  </Stack>
                  <Muted sx={{ fontSize: 12.5 }}>
                    {l.allow_tasks ? "View + tasks" : "View only"} · created {fmtDay(l.created_at)}
                    {l.created_by ? ` by ${l.created_by}` : ""}
                    {l.expires_at ? ` · ${l.status === "expired" ? "expired" : "expires"} ${fmtDay(l.expires_at)}` : ""}
                  </Muted>
                  <Muted sx={{ fontSize: 12 }}>{l.last_accessed_at ? `Last opened ${fmtWhen(l.last_accessed_at)}` : "Not opened yet"}</Muted>
                </Stack>
                {l.status === "active" && (
                  <Button size="small" color="inherit" onClick={() => setRevoking(l)} sx={{ color: "error.main" }}>
                    Turn off
                  </Button>
                )}
              </Stack>
            ))}
            <Muted sx={{ fontSize: 12 }}>For security a link is shown only when it&apos;s created. Lost it? Turn it off and create a new one.</Muted>
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Done</Button>
      </DialogActions>

      {newUrl && (
        <LinkDialog
          title="Share link ready"
          body="Send this link to anyone who should follow the project. It opens without a login."
          url={newUrl}
          onClose={() => setNewUrl(null)}
        />
      )}
      <ConfirmDialog
        open={!!revoking}
        onClose={() => setRevoking(null)}
        destructive
        title={`Turn off the link for ${revoking?.label}?`}
        description="The link stops working right away. Tasks they added stay on the project."
        confirmLabel="Turn off"
        onConfirm={async () => {
          try {
            await sa.revoke(revoking!.id);
            load();
          } catch (e) {
            setError(applyApiError(e, () => {}) ?? "Could not turn off the link");
          }
        }}
      />
    </FormDrawer>
  );
}
