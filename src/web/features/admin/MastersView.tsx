"use client";

import AddOutlined from "@mui/icons-material/AddOutlined";
import MoreHorizOutlined from "@mui/icons-material/MoreHorizOutlined";
import TuneOutlined from "@mui/icons-material/TuneOutlined";
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
import { Form, Formik } from "formik";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ConfirmDialog } from "@web/components/dialogs";
import { FieldRow, FormikSwitch, FormikTextField } from "@web/components/form";
import {
  EmptyState,
  FilterSelect,
  ListCard,
  PageHeader,
  SearchField,
  SortHead,
  sortRows,
  StatusTag,
  TabBar,
  type Sort,
} from "@web/components/ui";
import { Yup } from "@web/lib/validation";
import { tokens } from "@web/theme/tokens";
import { MASTER_TYPE_KEYS, MASTER_TYPES, type MasterItemDto, type MasterType } from "@shared/contracts/masters";
import { applyApiError } from "@web/features/customers/api";
import { mastersApi } from "./api";

const usedBy = (n: number) => (n ? `${n} record${n === 1 ? "" : "s"}` : "Not used");

export function MastersView() {
  const [type, setType] = useState<MasterType>(MASTER_TYPE_KEYS[0]);
  const [items, setItems] = useState<MasterItemDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [sort, setSort] = useState<Sort<"name" | "sort_order" | "in_use">>({ key: "sort_order", dir: "asc" });
  const [menu, setMenu] = useState<{ el: HTMLElement; item: MasterItemDto } | null>(null);
  const [editing, setEditing] = useState<MasterItemDto | "new" | null>(null);
  const [deleting, setDeleting] = useState<MasterItemDto | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const meta = MASTER_TYPES[type];

  const load = useCallback(() => {
    mastersApi
      .list(type)
      .then((r) => (setItems(r), setError(null)))
      .catch((e: Error) => setError(e.message));
  }, [type]);
  useEffect(load, [load]);

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    const list = (items ?? []).filter(
      (i) =>
        (!t || `${i.name} ${i.code ?? ""}`.toLowerCase().includes(t)) &&
        (status === "all" || (status === "active") === i.is_active),
    );
    return sortRows(list, sort, (i, k) => (k === "name" ? i.name.toLowerCase() : i[k]));
  }, [items, q, status, sort]);
  const filtered = !!q.trim() || status !== "all";
  const inactive = items?.filter((i) => !i.is_active).length ?? 0;

  const toggleActive = async (item: MasterItemDto) => {
    try {
      await mastersApi.update(type, item.id, { is_active: !item.is_active });
      setToast(`${item.name} ${item.is_active ? "deactivated" : "activated"}`);
      load();
    } catch (e) {
      setToast(applyApiError(e, () => {}) ?? "Could not update");
    }
  };

  return (
    <>
      <PageHeader
        title="Master data"
        subtitle={
          items
            ? `Lists every company picks from · ${items.length} ${meta.label.toLowerCase()}${inactive ? `, ${inactive} inactive` : ""}`
            : "Lists every company picks from."
        }
        actions={
          <Button variant="contained" color="primary" startIcon={<AddOutlined />} onClick={() => setEditing("new")}>
            Add {meta.singular.toLowerCase()}
          </Button>
        }
      />
      {error && <Alert severity="error">{error}</Alert>}

      <ListCard
        tabs={
          <TabBar
            label="Master lists"
            value={type}
            onChange={(t) => (setType(t), setItems(null), setQ(""), setStatus("all"))}
            items={MASTER_TYPE_KEYS.map((k) => ({ value: k, label: MASTER_TYPES[k].label }))}
          />
        }
        filters={
          <>
            <FilterSelect
              label="Status"
              value={status}
              onChange={setStatus}
              options={[
                { value: "all", label: "All" },
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
              ]}
            />
            {filtered && (
              <Button variant="text" size="small" onClick={() => (setQ(""), setStatus("all"))}>
                Clear
              </Button>
            )}
          </>
        }
        search={
          <SearchField
            label={`Search ${meta.label.toLowerCase()}`}
            placeholder={meta.hasCode ? "Name or code" : "Name"}
            value={q}
            onChange={setQ}
          />
        }
      >
        {items && rows.length === 0 ? (
          <EmptyState
            icon={<TuneOutlined />}
            title={filtered ? "No matches" : `No ${meta.label.toLowerCase()} yet`}
            action={
              !filtered ? (
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddOutlined />}
                  onClick={() => setEditing("new")}
                >
                  Add {meta.singular.toLowerCase()}
                </Button>
              ) : undefined
            }
          />
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <SortHead k="name" sort={sort} onSort={setSort}>
                    Name
                  </SortHead>
                  {meta.hasCode && <TableCell>Code</TableCell>}
                  <SortHead k="sort_order" sort={sort} onSort={setSort} align="right">
                    Order
                  </SortHead>
                  <TableCell>Status</TableCell>
                  <SortHead k="in_use" sort={sort} onSort={setSort}>
                    Used by
                  </SortHead>
                  <TableCell align="right">
                    <Box
                      component="span"
                      sx={{
                        position: "absolute",
                        width: "1px",
                        height: "1px",
                        overflow: "hidden",
                        clip: "rect(0 0 0 0)",
                      }}
                    >
                      Actions
                    </Box>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((i) => (
                  <TableRow key={i.id} hover sx={{ cursor: "pointer" }} onClick={() => setEditing(i)}>
                    <TableCell sx={{ fontWeight: 500 }}>{i.name}</TableCell>
                    {meta.hasCode && (
                      <TableCell>
                        <Box component="code" sx={{ fontSize: 12.5, color: tokens.ink2 }}>
                          {i.code}
                        </Box>
                      </TableCell>
                    )}
                    <TableCell align="right" sx={{ typography: "num", color: "text.secondary" }}>
                      {i.sort_order}
                    </TableCell>
                    <TableCell>
                      <StatusTag tone={i.is_active ? "success" : "neutral"}>
                        {i.is_active ? "Active" : "Inactive"}
                      </StatusTag>
                    </TableCell>
                    <TableCell sx={{ color: "text.secondary" }}>{usedBy(i.in_use)}</TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        aria-label={`Actions for ${i.name}`}
                        onClick={(e) => (e.stopPropagation(), setMenu({ el: e.currentTarget, item: i }))}
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
      </ListCard>

      <Menu anchorEl={menu?.el} open={!!menu} onClose={() => setMenu(null)}>
        <MenuItem onClick={() => (setEditing(menu!.item), setMenu(null))}>Edit</MenuItem>
        {menu && (
          <MenuItem onClick={() => (setMenu(null), toggleActive(menu.item))}>
            {menu.item.is_active ? "Deactivate" : "Activate"}
          </MenuItem>
        )}
        <MenuItem onClick={() => (setDeleting(menu!.item), setMenu(null))} sx={{ color: tokens.danger }}>
          Delete…
        </MenuItem>
      </Menu>

      {editing && (
        <MasterDialog
          type={type}
          item={editing === "new" ? null : editing}
          nextOrder={Math.max(0, ...(items ?? []).map((i) => i.sort_order)) + 10}
          onClose={() => setEditing(null)}
          onSaved={(msg) => (setEditing(null), setToast(msg), load())}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        destructive
        title={`Delete ${deleting?.name}?`}
        description="Items that companies already use can't be deleted. Deactivate them instead to hide them from menus."
        confirmLabel="Delete"
        onConfirm={async () => {
          try {
            await mastersApi.remove(type, deleting!.id);
            setToast(`${deleting!.name} deleted`);
            load();
          } catch (e) {
            setToast(applyApiError(e, () => {}) ?? "Could not delete");
          }
        }}
      />
      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)} message={toast} />
    </>
  );
}

type MasterForm = { name: string; code: string; sort_order: string; is_active: boolean };

function MasterDialog({
  type,
  item,
  nextOrder,
  onClose,
  onSaved,
}: {
  type: MasterType;
  item: MasterItemDto | null;
  nextOrder: number;
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const meta = MASTER_TYPES[type];
  const isNew = !item;
  const codeLocked = !!item && item.in_use > 0;
  const schema = Yup.object({
    name: Yup.string().trim().required("Name is required.").max(120),
    sort_order: Yup.number().typeError("Enter a number.").integer("Whole numbers only.").min(0, "Can't be negative."),
    ...(meta.hasCode && {
      code: Yup.string()
        .trim()
        .required("Code is required.")
        .max(64)
        .matches(/^[A-Za-z0-9_/+-]+$/, "Use letters, numbers, _ / + or -."),
    }),
  });

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <Formik<MasterForm>
        initialValues={{
          name: item?.name ?? "",
          code: item?.code ?? "",
          sort_order: String(item?.sort_order ?? nextOrder),
          is_active: item?.is_active ?? true,
        }}
        validationSchema={schema}
        onSubmit={async (vals, { setStatus, setFieldError }) => {
          setStatus(null);
          const input = {
            name: vals.name.trim(),
            sort_order: Number(vals.sort_order || 0),
            is_active: vals.is_active,
            ...(meta.hasCode && !codeLocked && { code: vals.code.trim() }),
          };
          try {
            const saved = isNew ? await mastersApi.create(type, input) : await mastersApi.update(type, item.id, input);
            onSaved(isNew ? `${saved.name} added` : `${saved.name} updated`);
          } catch (e) {
            setStatus(applyApiError(e, setFieldError));
          }
        }}
      >
        {({ isSubmitting, status }) => (
          <Form noValidate>
            <DialogTitle>{isNew ? `Add ${meta.singular.toLowerCase()}` : `Edit ${item.name}`}</DialogTitle>
            <DialogContent>
              <Stack gap={2}>
                {status && <Alert severity="error">{status}</Alert>}
                <FormikTextField name="name" label="Name" autoFocus />
                <FieldRow min={120}>
                  {meta.hasCode && (
                    <FormikTextField
                      name="code"
                      label="Code"
                      disabled={codeLocked}
                      hint={codeLocked ? `Locked: used by ${usedBy(item.in_use)}.` : meta.codeHint}
                    />
                  )}
                  <FormikTextField name="sort_order" label="Order" inputMode="numeric" hint="Lower shows first." />
                </FieldRow>
                <FormikSwitch
                  name="is_active"
                  label="Active"
                  description="Inactive items are hidden from menus but kept on existing companies."
                />
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={onClose}>Cancel</Button>
              <Button type="submit" variant="contained" color="primary" disabled={isSubmitting}>
                {isNew ? "Add" : "Save changes"}
              </Button>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </Dialog>
  );
}
