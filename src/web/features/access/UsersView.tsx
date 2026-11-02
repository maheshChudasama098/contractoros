"use client";

import MoreHorizOutlined from "@mui/icons-material/MoreHorizOutlined";
import ContentCopyOutlined from "@mui/icons-material/ContentCopyOutlined";
import PersonAddAltOutlined from "@mui/icons-material/PersonAddAltOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import { Form, Formik, useFormikContext } from "formik";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ConfirmDialog } from "@web/components/dialogs";
import { FormikPasswordField, FormikSelect, FormikTextField } from "@web/components/form";
import {
  EmptyState,
  InitialsAvatar,
  Muted,
  PageHeader,
  SearchField,
  SectionCard,
  StatusTag,
  TwoLine,
} from "@web/components/ui";
import { v, Yup } from "@web/lib/validation";
import { tokens } from "@web/theme/tokens";
import type { InvitationWithLink, MemberDto, RoleDto } from "@shared/contracts/access";
import { accessApi, applyApiError } from "./api";

const STATUS_TONE = { active: "success", suspended: "danger", invited: "warning" } as const;
const STATUS_LABEL = { active: "Active", suspended: "Suspended", invited: "Invited" } as const;

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "Never";

export const RoleChip = ({ children }: { children: string }) => (
  <Box
    component="span"
    sx={{
      display: "inline-flex",
      alignItems: "center",
      height: 24,
      px: 1,
      borderRadius: "6px",
      border: `1px solid ${tokens.border}`,
      fontSize: 12.5,
      fontWeight: 500,
      bgcolor: "#fff",
    }}
  >
    {children}
  </Box>
);

export function UsersView() {
  const [users, setUsers] = useState<MemberDto[] | null>(null);
  const [roles, setRoles] = useState<RoleDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [menu, setMenu] = useState<{ el: HTMLElement; m: MemberDto } | null>(null);
  const [editing, setEditing] = useState<MemberDto | "new" | null>(null);
  const [removing, setRemoving] = useState<MemberDto | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [link, setLink] = useState<InvitationWithLink | null>(null);

  const load = useCallback(() => {
    Promise.all([accessApi.users(), accessApi.roles()])
      .then(([u, r]) => (setUsers(u), setRoles(r), setError(null)))
      .catch((e: Error) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  const rows = useMemo(
    () => (users ?? []).filter((m) => `${m.name} ${m.email}`.toLowerCase().includes(q.trim().toLowerCase())),
    [users, q],
  );
  const active = users?.filter((u) => u.status === "active").length ?? 0;
  const invited = users?.filter((u) => u.status === "invited").length ?? 0;

  const sendInvite = async (m: MemberDto) => {
    try {
      setLink(await accessApi.inviteUser(m.id));
      load();
    } catch (e) {
      setToast(applyApiError(e, () => {}) ?? "Could not create invite link");
    }
  };

  return (
    <>
      <PageHeader
        title="Users"
        subtitle={
          users
            ? `${active} active · ${users.length} total${invited ? ` · ${invited} invited` : ""}`
            : "Loading…"
        }
        actions={
          <Button variant="contained" color="primary" startIcon={<PersonAddAltOutlined />} onClick={() => setEditing("new")}>
            Add user
          </Button>
        }
      />
      {error && <Alert severity="error">{error}</Alert>}

      <SectionCard
        title="All users"
        action={<SearchField label="Filter users" placeholder="Search name or email" value={q} onChange={setQ} />}
      >
        {users && rows.length === 0 ? (
          <EmptyState
            icon={<PersonAddAltOutlined />}
            title={q ? "No matching users" : "No users yet"}
            body={q ? undefined : "Add your first teammate to get started."}
          />
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Roles</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Last sign-in</TableCell>
                  <TableCell align="right">
                    <Box
                      component="span"
                      sx={{ position: "absolute", width: "1px", height: "1px", overflow: "hidden", clip: "rect(0 0 0 0)" }}
                    >
                      Actions
                    </Box>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((m) => (
                  <TableRow key={m.id} hover>
                    <TableCell>
                      <Stack direction="row" gap={1.25} alignItems="center">
                        <InitialsAvatar name={m.name} size={30} />
                        <TwoLine
                          title={m.is_self ? `${m.name} (you)` : m.name}
                          sub={m.job_title ? `${m.email} · ${m.job_title}` : m.email}
                        />
                      </Stack>
                    </TableCell>
                    <TableCell>{m.role ? <RoleChip>{m.role.name}</RoleChip> : <Muted>No role</Muted>}</TableCell>
                    <TableCell>
                      <StatusTag tone={STATUS_TONE[m.status]}>{STATUS_LABEL[m.status]}</StatusTag>
                    </TableCell>
                    <TableCell sx={{ color: "text.secondary" }}>
                      {m.status !== "invited"
                        ? fmtDate(m.last_login_at)
                        : !m.invite_expires_at
                          ? "Invite not sent"
                          : new Date(m.invite_expires_at) < new Date()
                            ? "Invite expired"
                            : `Invite sent · expires ${fmtDate(m.invite_expires_at)}`}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        aria-label={`Actions for ${m.name}`}
                        onClick={(e) => setMenu({ el: e.currentTarget, m })}
                      >
                        <MoreHorizOutlined fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </SectionCard>

      {link && <InviteLinkDialog invite={link} onClose={() => setLink(null)} />}

      <Menu anchorEl={menu?.el} open={!!menu} onClose={() => setMenu(null)}>
        <MenuItem onClick={() => (setEditing(menu!.m), setMenu(null))}>Edit user</MenuItem>
        {menu && menu.m.status === "invited" && (
          <MenuItem onClick={() => (setMenu(null), sendInvite(menu.m))}>
            {menu.m.invite_expires_at ? "Resend invite link" : "Send invite link"}
          </MenuItem>
        )}
        {menu && !menu.m.is_self && menu.m.status !== "invited" && (
          <MenuItem
            onClick={async () => {
              const m = menu.m;
              setMenu(null);
              try {
                await accessApi.updateUser(m.id, { status: m.status === "active" ? "suspended" : "active" });
                setToast(m.status === "active" ? `${m.name} suspended` : `${m.name} reactivated`);
                load();
              } catch (e) {
                setToast(applyApiError(e, () => {}) ?? "Could not update user");
              }
            }}
          >
            {menu.m.status === "active" ? "Suspend access" : "Reactivate"}
          </MenuItem>
        )}
        {menu && !menu.m.is_self && (
          <MenuItem onClick={() => (setRemoving(menu.m), setMenu(null))} sx={{ color: tokens.danger }}>
            Remove from company…
          </MenuItem>
        )}
      </Menu>

      {editing && (
        <UserDialog
          member={editing === "new" ? null : editing}
          roles={roles}
          onClose={() => setEditing(null)}
          onSaved={(msg) => (setEditing(null), setToast(msg), load())}
        />
      )}

      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        destructive
        title={`Remove ${removing?.name}?`}
        description="They will lose access to this company right away. Their account and past activity are kept."
        confirmLabel="Remove user"
        onConfirm={async () => {
          try {
            await accessApi.deleteUser(removing!.id);
            setToast(`${removing!.name} removed`);
            load();
          } catch (e) {
            setToast(applyApiError(e, () => {}) ?? "Could not remove user");
          }
        }}
      />
      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)} message={toast} />
    </>
  );
}

// ------------------------------------------------------- Add / edit dialog

type UserForm = {
  name: string;
  email: string;
  password: string;
  job_title: string;
  status: "active" | "suspended" | "invited";
  role_id: string;
};

function RoleSelect({ roles, disabled }: { roles: RoleDto[]; disabled?: boolean }) {
  const { values } = useFormikContext<UserForm>();
  const picked = roles.find((r) => r.id === values.role_id);
  return (
    <FormikSelect
      name="role_id"
      label="Role"
      disabled={disabled}
      hint={
        disabled
          ? "You can't change your own role."
          : picked
            ? `${picked.permissions.length} permissions${picked.system ? " · System role" : " · Custom role"}`
            : "Each user has exactly one role."
      }
      SelectProps={{
        displayEmpty: true,
        renderValue: (id) =>
          roles.find((r) => r.id === id)?.name ?? (
            <Box component="span" sx={{ color: "text.disabled" }}>
              Select a role
            </Box>
          ),
      }}
      options={roles.map((r) => ({ value: r.id, label: r.name }))}
    />
  );
}

function UserDialog({
  member,
  roles,
  onClose,
  onSaved,
}: {
  member: MemberDto | null;
  roles: RoleDto[];
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const isNew = !member;
  const schema = Yup.object({
    name: v.required("Full name").min(2, "Enter the full name."),
    ...(isNew && {
      email: v.email(),
      password: Yup.string().min(10, "Use at least 10 characters."),
    }),
    role_id: Yup.string().required("Choose a role."),
  });

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <Formik<UserForm>
        initialValues={{
          name: member?.name ?? "",
          email: member?.email ?? "",
          password: "",
          job_title: member?.job_title ?? "",
          status: member?.status ?? "active",
          role_id: member?.role?.id ?? "",
        }}
        validationSchema={schema}
        onSubmit={async (vals, { setStatus, setFieldError }) => {
          setStatus(null);
          try {
            if (isNew) {
              await accessApi.createUser({
                name: vals.name.trim(),
                email: vals.email.trim(),
                password: vals.password || undefined,
                job_title: vals.job_title.trim() || undefined,
                role_id: vals.role_id,
              });
              onSaved(
                vals.password
                  ? `${vals.name} added`
                  : `${vals.name} added as Invited. Use ⋯ → Send invite link to invite them.`,
              );
            } else {
              await accessApi.updateUser(member.id, {
                name: vals.name.trim(),
                job_title: vals.job_title.trim() || null,
                ...(!member.is_self && { role_id: vals.role_id }),
                ...(!member.is_self && vals.status !== "invited" && member.status !== "invited" && { status: vals.status }),
              });
              onSaved(`${vals.name} updated`);
            }
          } catch (e) {
            setStatus(applyApiError(e, setFieldError));
          }
        }}
      >
        {({ isSubmitting, status }) => (
          <Form noValidate>
            <DialogTitle>{isNew ? "Add user" : `Edit ${member.name}`}</DialogTitle>
            <DialogContent>
              <Stack gap={2}>
                {status && <Alert severity="error">{status}</Alert>}
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "repeat(2, minmax(0, 1fr))" },
                    gap: 2,
                    alignItems: "start",
                  }}
                >
                  <FormikTextField name="name" label="Full name" autoFocus />
                  <FormikTextField name="email" label="Email" type="email" disabled={!isNew} />
                  {isNew ? (
                    <FormikPasswordField
                      name="password"
                      label="Temporary password"
                      autoComplete="new-password"
                      placeholder="Optional"
                      hint="Leave blank to invite them instead — they'll set their own password."
                    />
                  ) : (
                    <FormikSelect
                      name="status"
                      label="Status"
                      disabled={member.is_self || member.status === "invited"}
                      hint={member.status === "invited" ? "Becomes Active when they accept the invite." : undefined}
                      options={[
                        { value: "active", label: "Active" },
                        { value: "suspended", label: "Suspended" },
                        ...(member.status === "invited" ? [{ value: "invited", label: "Invited" }] : []),
                      ]}
                    />
                  )}
                  <RoleSelect roles={roles} disabled={!!member?.is_self} />
                  <Box sx={{ gridColumn: { sm: "1 / -1" } }}>
                    <FormikTextField name="job_title" label="Job title" placeholder="Optional" />
                  </Box>
                </Box>
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={onClose}>Cancel</Button>
              <Button type="submit" variant="contained" color="primary" disabled={isSubmitting}>
                {isNew ? "Add user" : "Save changes"}
              </Button>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </Dialog>
  );
}

// ------------------------------------------------------- Invite link dialog

/** Shows the invite link once (only its hash is stored), so it can be shared until email sending exists. */
function InviteLinkDialog({ invite, onClose }: { invite: InvitationWithLink; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(invite.invite_url);
    setCopied(true);
  };
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Invitation ready</DialogTitle>
      <DialogContent>
        <Stack gap={2}>
          <Muted sx={{ fontSize: 13.5 }}>
            Send this link to <strong>{invite.email}</strong>
            {invite.role ? ` to join as ${invite.role.name}` : ""}. It expires on {fmtDate(invite.expires_at)} and works once.
          </Muted>
          <Stack direction="row" gap={1} alignItems="center">
            <Box
              component="input"
              readOnly
              value={invite.invite_url}
              onFocus={(e: React.FocusEvent<HTMLInputElement>) => e.currentTarget.select()}
              aria-label="Invite link"
              sx={{ flex: 1, minWidth: 0, height: 40, px: 1.5, border: `1px solid ${tokens.borderStrong}`, borderRadius: "8px", font: "inherit", fontSize: 13, bgcolor: tokens.surfaceMuted, color: tokens.ink2 }}
            />
            <Button startIcon={<ContentCopyOutlined />} onClick={copy}>
              {copied ? "Copied" : "Copy"}
            </Button>
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="contained" color="primary" onClick={onClose}>
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
}
