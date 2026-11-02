"use client";

import AddOutlined from "@mui/icons-material/AddOutlined";
import ArrowBackOutlined from "@mui/icons-material/ArrowBackOutlined";
import ContentCopyOutlined from "@mui/icons-material/ContentCopyOutlined";
import DeleteOutlineOutlined from "@mui/icons-material/DeleteOutlineOutlined";
import LockOutlined from "@mui/icons-material/LockOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { Form, Formik, useFormikContext } from "formik";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ConfirmDialog } from "@web/components/dialogs";
import { useBreadcrumbLabel } from "@web/components/layout/breadcrumb-label";
import { FormikTextField } from "@web/components/form";
import { Muted, PageHeader, SectionCard, StatusTag } from "@web/components/ui";
import { v, Yup } from "@web/lib/validation";
import { tokens } from "@web/theme/tokens";
import { PERMISSION_GROUPS, type RoleDto } from "@shared/contracts/access";
import { accessApi, applyApiError } from "./api";

const TOTAL_PERMISSIONS = PERMISSION_GROUPS.reduce((n, g) => n + g.items.length, 0);

// ------------------------------------------------------------------ List

export function RolesView() {
  const router = useRouter();
  const [roles, setRoles] = useState<RoleDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    accessApi
      .roles()
      .then(setRoles)
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <>
      <PageHeader
        eyebrow="Auth management"
        title="Roles"
        subtitle="Roles bundle permissions. Every request is checked on the server against the user's roles."
        actions={
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddOutlined />}
            onClick={() => router.push("/roles/new")}
          >
            Add role
          </Button>
        }
      />
      {error && <Alert severity="error">{error}</Alert>}
      <SectionCard title="All roles">
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Role</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Permissions</TableCell>
                <TableCell align="right">Users</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {roles?.map((r) => (
                <TableRow key={r.id} hover sx={{ cursor: "pointer" }} onClick={() => router.push(`/roles/${r.id}`)}>
                  <TableCell sx={{ fontWeight: 500 }}>
                    <Link href={`/roles/${r.id}`} onClick={(e) => e.stopPropagation()} style={{ color: "inherit" }}>
                      {r.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {r.system ? (
                      <StatusTag tone="neutral" dot={false}>
                        System
                      </StatusTag>
                    ) : (
                      <StatusTag tone="brand" dot={false}>
                        Custom
                      </StatusTag>
                    )}
                  </TableCell>
                  <TableCell sx={{ color: "text.secondary" }}>
                    {r.permissions.length} of {TOTAL_PERMISSIONS}
                  </TableCell>
                  <TableCell align="right">{r.member_count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </SectionCard>
    </>
  );
}

// ---------------------------------------------------------------- Editor

type RoleForm = { name: string; permissions: string[] };

function PermissionMatrix({ readOnly }: { readOnly: boolean }) {
  const { values, setFieldValue } = useFormikContext<RoleForm>();
  const has = new Set(values.permissions);
  const set = (keys: string[], on: boolean) => {
    const next = new Set(values.permissions);
    for (const k of keys) {
      if (on) next.add(k);
      else next.delete(k);
    }
    setFieldValue("permissions", [...next]);
  };

  return (
    <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "repeat(2, minmax(0, 1fr))" } }}>
      {PERMISSION_GROUPS.map((g) => {
        const keys = g.items.map((i) => i.key);
        const n = keys.filter((k) => has.has(k)).length;
        return (
          <Box
            key={g.group}
            component="fieldset"
            sx={{ m: 0, p: 0, minWidth: 0, border: `1px solid ${tokens.border}`, borderRadius: "12px", overflow: "hidden" }}
          >
            <Box
              component="label"
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                px: 1.5,
                py: 1,
                bgcolor: tokens.surfaceMuted,
                borderBottom: `1px solid ${tokens.divider}`,
                cursor: readOnly ? "default" : "pointer",
              }}
            >
              <Checkbox
                size="small"
                disabled={readOnly}
                checked={n === keys.length}
                indeterminate={n > 0 && n < keys.length}
                onChange={(e) => set(keys, e.target.checked)}
                inputProps={{ "aria-label": `All ${g.group} permissions` }}
                sx={{ p: 0.25 }}
              />
              <Box component="legend" sx={{ fontWeight: 600, fontSize: 14, flex: 1, p: 0 }}>
                {g.group}
              </Box>
              <Muted sx={{ fontSize: 12 }}>
                {n}/{keys.length}
              </Muted>
            </Box>
            <Stack sx={{ py: 0.5 }}>
              {g.items.map((i) => (
                <Box
                  key={i.key}
                  component="label"
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    px: 1.5,
                    py: 0.75,
                    cursor: readOnly ? "default" : "pointer",
                  }}
                >
                  <Checkbox
                    size="small"
                    disabled={readOnly}
                    checked={has.has(i.key)}
                    onChange={(e) => set([i.key], e.target.checked)}
                    sx={{ p: 0.25 }}
                  />
                  <Stack sx={{ flex: 1 }}>
                    <Box sx={{ fontSize: 14 }}>{i.label}</Box>
                    <Muted sx={{ fontSize: 11.5, fontFamily: "ui-monospace, monospace" }}>{i.key}</Muted>
                  </Stack>
                </Box>
              ))}
            </Stack>
          </Box>
        );
      })}
    </Box>
  );
}

/** Create (no `id`) or view/edit a role. `?from=<roleId>` pre-fills a new role from an existing one. */
export function RoleEditorView({ id }: { id?: string }) {
  const router = useRouter();
  const from = useSearchParams().get("from");
  const [role, setRole] = useState<RoleDto | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const sourceId = id ?? from;
  useBreadcrumbLabel(id ? role?.name : "New role");
  useEffect(() => {
    if (sourceId)
      accessApi
        .role(sourceId)
        .then(setRole)
        .catch((e: Error) => setLoadError(e.message));
  }, [sourceId]);

  if (loadError) return <Alert severity="error">{loadError}</Alert>;
  if (sourceId && !role) return null;

  const isNew = !id;
  const readOnly = !isNew && !!role?.system;

  return (
    <>
      <PageHeader
        eyebrow={
          <Button
            size="small"
            variant="text"
            startIcon={<ArrowBackOutlined sx={{ fontSize: 16 }} />}
            onClick={() => router.push("/roles")}
            sx={{
              ml: -1,
              px: 1,
              minHeight: 0,
              height: 28,
              color: "text.secondary",
              fontWeight: 500,
              "&:hover": { color: "text.primary" },
            }}
          >
            Back to roles
          </Button>
        }
        title={isNew ? "Add role" : role!.name}
        subtitle={
          isNew
            ? "Name the role and choose what it can do."
            : `${role!.member_count} user(s) have this role${role!.system ? " · System role (read-only)" : ""}`
        }
        actions={
          !isNew && (
            <>
              <Button
                startIcon={<ContentCopyOutlined fontSize="small" />}
                onClick={() => router.push(`/roles/new?from=${role!.id}`)}
              >
                Duplicate
              </Button>
              {!role!.system && (
                <Button
                  color="error"
                  startIcon={<DeleteOutlineOutlined fontSize="small" />}
                  onClick={() => setConfirmDelete(true)}
                >
                  Delete role
                </Button>
              )}
            </>
          )
        }
      />

      {readOnly && (
        <Alert severity="info" icon={<LockOutlined fontSize="small" />}>
          System roles are shared by every company and can&apos;t be edited. Use <strong>Duplicate</strong> to create a
          custom version.
        </Alert>
      )}

      <Formik<RoleForm>
        initialValues={{
          name: isNew && role ? `${role.name} (copy)` : (role?.name ?? ""),
          permissions: role?.permissions ?? [],
        }}
        validationSchema={Yup.object({ name: v.required("Role name").min(2, "Enter a role name.").max(100) })}
        onSubmit={async (vals, { setStatus, setFieldError, resetForm }) => {
          setStatus(null);
          try {
            if (isNew) {
              const created = await accessApi.createRole({ name: vals.name.trim(), permissions: vals.permissions });
              router.replace(`/roles/${created.id}`);
            } else {
              const updated = await accessApi.updateRole(id, { name: vals.name.trim(), permissions: vals.permissions });
              setRole(updated);
              resetForm({ values: { name: updated.name, permissions: updated.permissions } });
              setToast("Role saved");
            }
          } catch (e) {
            setStatus(applyApiError(e, setFieldError));
          }
        }}
      >
        {({ isSubmitting, status, dirty, values }) => (
          <Form noValidate>
            <SectionCard
              title={
                <Stack>
                  <Typography variant="h3">Permissions</Typography>
                  <Muted sx={{ fontSize: 12.5 }}>
                    {values.permissions.length} of {TOTAL_PERMISSIONS} selected
                  </Muted>
                </Stack>
              }
              bodySx={{ p: 2.5 }}
            >
              <Stack gap={2.5}>
                {status && <Alert severity="error">{status}</Alert>}
                <Box sx={{ maxWidth: 420 }}>
                  <FormikTextField name="name" label="Role name" disabled={readOnly} autoFocus={isNew} />
                </Box>
                <PermissionMatrix readOnly={readOnly} />
                {!readOnly && (
                  <Stack direction="row" gap={1} justifyContent="flex-end">
                    <Button onClick={() => router.push("/roles")}>Cancel</Button>
                    <Button
                      type="submit"
                      variant="contained"
                      color="primary"
                      disabled={isSubmitting || (!isNew && !dirty)}
                    >
                      {isNew ? "Create role" : "Save changes"}
                    </Button>
                  </Stack>
                )}
              </Stack>
            </SectionCard>
          </Form>
        )}
      </Formik>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        destructive
        title={`Delete ${role?.name}?`}
        description={
          role?.member_count
            ? `This role is assigned to ${role.member_count} user(s). Reassign them before deleting.`
            : "This can't be undone."
        }
        confirmLabel="Delete role"
        onConfirm={async () => {
          try {
            await accessApi.deleteRole(id!);
            router.replace("/roles");
          } catch (e) {
            setToast(applyApiError(e, () => {}) ?? "Could not delete role");
          }
        }}
      />
      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)} message={toast} />
    </>
  );
}
