"use client";

import AddOutlined from "@mui/icons-material/AddOutlined";
import MoreHorizOutlined from "@mui/icons-material/MoreHorizOutlined";
import PeopleOutline from "@mui/icons-material/PeopleOutline";
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
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import { Form, Formik } from "formik";
import { useCallback, useEffect, useState } from "react";
import { ConfirmDialog } from "@web/components/dialogs";
import { FieldRow, FormikRadioGroup, FormikTextField } from "@web/components/form";
import { EmptyState, InitialsAvatar, Muted, PageHeader, SearchField, SectionCard, StatusTag, TabBar, TwoLine } from "@web/components/ui";
import { v, Yup } from "@web/lib/validation";
import { tokens } from "@web/theme/tokens";
import type { CustomerDto, CustomerInput, CustomerStatus } from "@shared/contracts/customers";
import { applyApiError, customersApi } from "./api";

type Tab = CustomerStatus | "all";
const PAGE_SIZES = [10, 25, 50];

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
const cityLine = (c: CustomerDto) => [c.billing_city, c.billing_state].filter(Boolean).join(", ");

/** Every editable field, so edits always send the full record (PUT). */
const toInput = (c: CustomerDto): CustomerInput => ({
  customer_type: c.customer_type,
  first_name: c.first_name,
  last_name: c.last_name,
  company_name: c.company_name,
  email: c.email,
  phone: c.phone,
  billing_address_line1: c.billing_address_line1,
  billing_address_line2: c.billing_address_line2,
  billing_city: c.billing_city,
  billing_state: c.billing_state,
  billing_postal_code: c.billing_postal_code,
  notes: c.notes,
  status: c.status,
});

export function CustomersView() {
  const [tab, setTab] = useState<Tab>("active");
  const [q, setQ] = useState("");
  const [query, setQuery] = useState(""); // debounced search term
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(PAGE_SIZES[0]!);
  const [data, setData] = useState<{ items: CustomerDto[]; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ el: HTMLElement; c: CustomerDto } | null>(null);
  const [editing, setEditing] = useState<CustomerDto | "new" | null>(null);
  const [deleting, setDeleting] = useState<CustomerDto | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => (setQuery(q.trim()), setPage(0)), 300);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(() => {
    customersApi
      .list({ status: tab, q: query || undefined, page: page + 1, per_page: perPage })
      .then((r) => (setData({ items: r.items, total: r.total }), setError(null)))
      .catch((e: Error) => setError(e.message));
  }, [tab, query, page, perPage]);
  useEffect(load, [load]);

  const setStatus = async (c: CustomerDto, status: CustomerStatus) => {
    try {
      await customersApi.update(c.id, { ...toInput(c), status });
      setToast(status === "archived" ? `${c.display_name} archived` : `${c.display_name} restored`);
      load();
    } catch (e) {
      setToast(applyApiError(e, () => {}) ?? "Could not update customer");
    }
  };

  return (
    <>
      <PageHeader
        title="Customers"
        subtitle={data ? `${data.total} ${tab === "all" ? "total" : tab}` : "Loading…"}
        actions={
          <Button variant="contained" color="primary" startIcon={<AddOutlined />} onClick={() => setEditing("new")}>
            New customer
          </Button>
        }
      />
      {error && <Alert severity="error">{error}</Alert>}

      <TabBar
        label="Status"
        value={tab}
        onChange={(t) => (setTab(t), setPage(0))}
        items={[
          { value: "active", label: "Active" },
          { value: "archived", label: "Archived" },
          { value: "all", label: "All" },
        ]}
      />

      <SectionCard
        title="All customers"
        action={<SearchField label="Search customers" placeholder="Name, email, phone or city" value={q} onChange={setQ} />}
      >
        {data && data.items.length === 0 ? (
          <EmptyState
            icon={<PeopleOutline />}
            title={query ? "No matching customers" : tab === "archived" ? "No archived customers" : "No customers yet"}
            body={query || tab === "archived" ? undefined : "Add your first customer to start estimates and projects."}
            action={
              !query && tab !== "archived" ? (
                <Button variant="contained" color="primary" startIcon={<AddOutlined />} onClick={() => setEditing("new")}>
                  New customer
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Customer</TableCell>
                    <TableCell>Phone</TableCell>
                    <TableCell>City</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Added</TableCell>
                    <TableCell align="right">
                      <Box component="span" sx={{ position: "absolute", width: "1px", height: "1px", overflow: "hidden", clip: "rect(0 0 0 0)" }}>
                        Actions
                      </Box>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(data?.items ?? []).map((c) => (
                    <TableRow key={c.id} hover sx={{ cursor: "pointer" }} onClick={() => setEditing(c)}>
                      <TableCell>
                        <Stack direction="row" gap={1.25} alignItems="center">
                          <InitialsAvatar name={c.display_name} size={30} />
                          <TwoLine
                            title={c.display_name}
                            sub={[c.customer_type === "company" ? "Company" : null, c.email].filter(Boolean).join(" · ") || "No email"}
                          />
                        </Stack>
                      </TableCell>
                      <TableCell>{c.phone ?? <Muted>—</Muted>}</TableCell>
                      <TableCell>{cityLine(c) || <Muted>—</Muted>}</TableCell>
                      <TableCell>
                        <StatusTag tone={c.status === "active" ? "success" : "neutral"}>{c.status === "active" ? "Active" : "Archived"}</StatusTag>
                      </TableCell>
                      <TableCell sx={{ color: "text.secondary" }}>{fmtDate(c.created_at)}</TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          aria-label={`Actions for ${c.display_name}`}
                          onClick={(e) => (e.stopPropagation(), setMenu({ el: e.currentTarget, c }))}
                        >
                          <MoreHorizOutlined fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            {data && (
              <TablePagination
                component="div"
                count={data.total}
                page={page}
                rowsPerPage={perPage}
                rowsPerPageOptions={PAGE_SIZES}
                onPageChange={(_, p) => setPage(p)}
                onRowsPerPageChange={(e) => (setPerPage(Number(e.target.value)), setPage(0))}
                sx={{ borderTop: `1px solid ${tokens.divider}` }}
              />
            )}
          </>
        )}
      </SectionCard>

      <Menu anchorEl={menu?.el} open={!!menu} onClose={() => setMenu(null)}>
        <MenuItem onClick={() => (setEditing(menu!.c), setMenu(null))}>Edit customer</MenuItem>
        {menu && (
          <MenuItem onClick={() => (setMenu(null), setStatus(menu.c, menu.c.status === "active" ? "archived" : "active"))}>
            {menu.c.status === "active" ? "Archive" : "Restore"}
          </MenuItem>
        )}
        <MenuItem onClick={() => (setDeleting(menu!.c), setMenu(null))} sx={{ color: tokens.danger }}>
          Delete…
        </MenuItem>
      </Menu>

      {editing && (
        <CustomerDialog
          customer={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(msg) => (setEditing(null), setToast(msg), load())}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        destructive
        title={`Delete ${deleting?.display_name}?`}
        description="This permanently removes the customer. Customers with estimates, projects or invoices can only be archived."
        confirmLabel="Delete customer"
        onConfirm={async () => {
          try {
            await customersApi.remove(deleting!.id);
            setToast(`${deleting!.display_name} deleted`);
            load();
          } catch (e) {
            setToast(applyApiError(e, () => {}) ?? "Could not delete customer");
          }
        }}
      />
      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)} message={toast} />
    </>
  );
}

// ------------------------------------------------------- Add / edit dialog

type CustomerForm = {
  customer_type: "individual" | "company";
  first_name: string;
  last_name: string;
  company_name: string;
  email: string;
  phone: string;
  billing_address_line1: string;
  billing_address_line2: string;
  billing_city: string;
  billing_state: string;
  billing_postal_code: string;
  notes: string;
};

const schema = Yup.object({
  customer_type: Yup.string().oneOf(["individual", "company"]).required(),
  first_name: Yup.string().trim().max(100),
  last_name: Yup.string().trim().max(100),
  company_name: Yup.string()
    .trim()
    .max(160)
    .when("customer_type", { is: "company", then: (s) => s.required("Company name is required.") }),
  email: Yup.string().trim().email("Enter a valid email address."),
  phone: v.phone(),
  billing_postal_code: Yup.string().trim().max(20),
  notes: Yup.string().max(5000),
}).test("name", "First or last name is required.", function (vals) {
  if (vals.customer_type !== "individual" || vals.first_name?.trim() || vals.last_name?.trim()) return true;
  return this.createError({ path: "first_name", message: "First or last name is required." });
});

const blank: CustomerForm = {
  customer_type: "individual",
  first_name: "",
  last_name: "",
  company_name: "",
  email: "",
  phone: "",
  billing_address_line1: "",
  billing_address_line2: "",
  billing_city: "",
  billing_state: "",
  billing_postal_code: "",
  notes: "",
};

export function CustomerDialog({
  customer,
  onClose,
  onSaved,
}: {
  customer: CustomerDto | null;
  onClose: () => void;
  onSaved: (msg: string, saved: CustomerDto) => void;
}) {
  const isNew = !customer;
  const initial: CustomerForm = customer
    ? (Object.fromEntries(Object.keys(blank).map((k) => [k, customer[k as keyof CustomerDto] ?? ""])) as CustomerForm)
    : blank;

  return (
    // stopPropagation: React bubbles submit through portals, so a dialog opened inside another form
    // (e.g. "New customer" from the project form) would otherwise submit the outer form too.
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" onSubmit={(e) => e.stopPropagation()}>
      <Formik<CustomerForm>
        initialValues={initial}
        validationSchema={schema}
        onSubmit={async (vals, { setStatus, setFieldError }) => {
          setStatus(null);
          const input: CustomerInput = { ...vals, status: customer?.status ?? "active" };
          try {
            const saved = isNew ? await customersApi.create(input) : await customersApi.update(customer.id, input);
            onSaved(isNew ? `${saved.display_name} added` : `${saved.display_name} updated`, saved);
          } catch (e) {
            setStatus(applyApiError(e, setFieldError));
          }
        }}
      >
        {({ values, isSubmitting, status }) => (
          <Form noValidate>
            <DialogTitle>{isNew ? "New customer" : `Edit ${customer.display_name}`}</DialogTitle>
            <DialogContent>
              <Stack gap={2}>
                {status && <Alert severity="error">{status}</Alert>}
                <FormikRadioGroup
                  name="customer_type"
                  row
                  options={[
                    { value: "individual", label: "Homeowner" },
                    { value: "company", label: "Company" },
                  ]}
                />
                {values.customer_type === "company" && <FormikTextField name="company_name" label="Company name" autoFocus />}
                <FieldRow>
                  <FormikTextField
                    name="first_name"
                    label={values.customer_type === "company" ? "Contact first name" : "First name"}
                    autoFocus={values.customer_type === "individual"}
                  />
                  <FormikTextField name="last_name" label={values.customer_type === "company" ? "Contact last name" : "Last name"} />
                </FieldRow>
                <FieldRow>
                  <FormikTextField name="email" label="Email" type="email" placeholder="Optional" />
                  <FormikTextField name="phone" label="Phone" type="tel" placeholder="Optional" />
                </FieldRow>
                <FormikTextField name="billing_address_line1" label="Billing address" placeholder="Street address" />
                <FormikTextField name="billing_address_line2" placeholder="Apt, suite (optional)" aria-label="Address line 2" />
                <FieldRow min={140}>
                  <FormikTextField name="billing_city" label="City" />
                  <FormikTextField name="billing_state" label="State" />
                  <FormikTextField name="billing_postal_code" label="ZIP code" />
                </FieldRow>
                <FormikTextField name="notes" label="Notes" multiline minRows={2} placeholder="Gate code, preferred contact time…" />
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={onClose}>Cancel</Button>
              <Button type="submit" variant="contained" color="primary" disabled={isSubmitting}>
                {isNew ? "Add customer" : "Save changes"}
              </Button>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </Dialog>
  );
}
