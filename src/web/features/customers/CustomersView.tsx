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
import TableRow from "@mui/material/TableRow";
import { Form, Formik } from "formik";
import { useCallback, useEffect, useState } from "react";
import { ConfirmDialog } from "@web/components/dialogs";
import { FieldRow, FormikRadioGroup, FormikTextField } from "@web/components/form";
import {
  EmptyState,
  FilterSelect,
  InitialsAvatar,
  ListCard,
  Muted,
  PAGE_SIZES,
  PageHeader,
  Pager,
  SearchField,
  SortHead,
  StatusTag,
  TabBar,
  TwoLine,
  type Sort,
} from "@web/components/ui";
import { v, Yup } from "@web/lib/validation";
import { tokens } from "@web/theme/tokens";
import type { ListPage } from "@shared/contracts/api";
import type { CustomerDto, CustomerInput, CustomerStatus } from "@shared/contracts/customers";
import { applyApiError, customersApi } from "./api";

type Tab = CustomerStatus | "all";

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
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

type SortKey = "display_name" | "billing_city" | "created_at";
type TypeFilter = "all" | "individual" | "company";

export function CustomersView() {
  const [tab, setTab] = useState<Tab>("active");
  const [q, setQ] = useState("");
  const [query, setQuery] = useState(""); // debounced search term
  const [type, setType] = useState<TypeFilter>("all");
  const [city, setCity] = useState("all");
  const [cities, setCities] = useState<string[]>([]);
  const [sort, setSort] = useState<Sort<SortKey>>({ key: "display_name", dir: "asc" });
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(PAGE_SIZES[0]!);
  const [data, setData] = useState<ListPage<CustomerDto, Tab> | null>(null);
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
      .list({
        status: tab,
        q: query || undefined,
        customer_type: type,
        city: city === "all" ? undefined : city,
        sort: sort.key,
        dir: sort.dir,
        page: page + 1,
        per_page: perPage,
      })
      .then((r) => (setData(r), setError(null)))
      .catch((e: Error) => setError(e.message));
  }, [tab, query, type, city, sort, page, perPage]);
  useEffect(load, [load]);
  useEffect(
    () =>
      void customersApi
        .cities()
        .then(setCities)
        .catch(() => {}),
    [data?.counts.all],
  );

  const reload = () => load();
  const filtered = !!query || type !== "all" || city !== "all";
  const clearFilters = () => (setQ(""), setQuery(""), setType("all"), setCity("all"), setPage(0));
  const onSort = (s: Sort<SortKey>) => (setSort(s), setPage(0));
  const c = data?.counts;

  const setStatus = async (cust: CustomerDto, status: CustomerStatus) => {
    try {
      await customersApi.update(cust.id, { ...toInput(cust), status });
      setToast(status === "archived" ? `${cust.display_name} archived` : `${cust.display_name} restored`);
      reload();
    } catch (e) {
      setToast(applyApiError(e, () => {}) ?? "Could not update customer");
    }
  };

  return (
    <>
      <PageHeader
        title="Customers"
        subtitle={
          c && !filtered
            ? c.all
              ? `Homeowners and companies you work for · ${c.active} active, ${c.archived} archived`
              : "Homeowners and companies you work for. Add one to start estimates and projects."
            : "Homeowners and companies you work for."
        }
        actions={
          <Button variant="contained" color="primary" startIcon={<AddOutlined />} onClick={() => setEditing("new")}>
            New customer
          </Button>
        }
      />
      {error && <Alert severity="error">{error}</Alert>}

      <ListCard
        tabs={
          <TabBar
            label="Status"
            value={tab}
            onChange={(t) => (setTab(t), setPage(0))}
            items={[
              { value: "active", label: "Active", count: c?.active },
              { value: "archived", label: "Archived", count: c?.archived },
              { value: "all", label: "All", count: c?.all },
            ]}
          />
        }
        filters={
          <>
            <FilterSelect
              label="Type"
              value={type}
              onChange={(v) => (setType(v), setPage(0))}
              options={[
                { value: "all", label: "All" },
                { value: "individual", label: "Homeowner" },
                { value: "company", label: "Company" },
              ]}
            />
            {cities.length > 0 && (
              <FilterSelect
                label="City"
                value={city}
                onChange={(v) => (setCity(v), setPage(0))}
                options={[{ value: "all", label: "All" }, ...cities.map((x) => ({ value: x, label: x }))]}
              />
            )}
            {filtered && (
              <Button variant="text" size="small" onClick={clearFilters}>
                Clear
              </Button>
            )}
          </>
        }
        search={
          <SearchField label="Search customers" placeholder="Name, email, phone or city" value={q} onChange={setQ} />
        }
      >
        {data && data.items.length === 0 ? (
          <EmptyState
            icon={<PeopleOutline />}
            title={
              filtered ? "No matching customers" : tab === "archived" ? "No archived customers" : "No customers yet"
            }
            body={
              filtered
                ? "Try a different search or clear the filters."
                : tab === "archived"
                  ? undefined
                  : "Add your first customer to start estimates and projects."
            }
            action={
              filtered ? (
                <Button onClick={clearFilters}>Clear filters</Button>
              ) : tab !== "archived" ? (
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddOutlined />}
                  onClick={() => setEditing("new")}
                >
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
                    <SortHead k="display_name" sort={sort} onSort={onSort}>
                      Customer
                    </SortHead>
                    <TableCell>Phone</TableCell>
                    <SortHead k="billing_city" sort={sort} onSort={onSort}>
                      City
                    </SortHead>
                    <TableCell>Status</TableCell>
                    <SortHead k="created_at" sort={sort} onSort={onSort}>
                      Added
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
                  {(data?.items ?? []).map((cust) => (
                    <TableRow key={cust.id} hover sx={{ cursor: "pointer" }} onClick={() => setEditing(cust)}>
                      <TableCell>
                        <Stack direction="row" gap={1.25} alignItems="center">
                          <InitialsAvatar name={cust.display_name} size={30} />
                          <TwoLine
                            title={cust.display_name}
                            sub={
                              [cust.customer_type === "company" ? "Company" : null, cust.email]
                                .filter(Boolean)
                                .join(" · ") || "No email"
                            }
                          />
                        </Stack>
                      </TableCell>
                      <TableCell>{cust.phone ?? <Muted>—</Muted>}</TableCell>
                      <TableCell>{cityLine(cust) || <Muted>—</Muted>}</TableCell>
                      <TableCell>
                        <StatusTag tone={cust.status === "active" ? "success" : "neutral"}>
                          {cust.status === "active" ? "Active" : "Archived"}
                        </StatusTag>
                      </TableCell>
                      <TableCell sx={{ color: "text.secondary" }}>{fmtDate(cust.created_at)}</TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          aria-label={`Actions for ${cust.display_name}`}
                          onClick={(e) => (e.stopPropagation(), setMenu({ el: e.currentTarget, c: cust }))}
                        >
                          <MoreHorizOutlined fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            {data && <Pager total={data.total} page={page} perPage={perPage} onPage={setPage} onPerPage={setPerPage} />}
          </>
        )}
      </ListCard>

      <Menu anchorEl={menu?.el} open={!!menu} onClose={() => setMenu(null)}>
        <MenuItem onClick={() => (setEditing(menu!.c), setMenu(null))}>Edit customer</MenuItem>
        {menu && (
          <MenuItem
            onClick={() => (setMenu(null), setStatus(menu.c, menu.c.status === "active" ? "archived" : "active"))}
          >
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
          onSaved={(msg) => (setEditing(null), setToast(msg), reload())}
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
                {values.customer_type === "company" && (
                  <FormikTextField name="company_name" label="Company name" autoFocus />
                )}
                <FieldRow>
                  <FormikTextField
                    name="first_name"
                    label={values.customer_type === "company" ? "Contact first name" : "First name"}
                    autoFocus={values.customer_type === "individual"}
                  />
                  <FormikTextField
                    name="last_name"
                    label={values.customer_type === "company" ? "Contact last name" : "Last name"}
                  />
                </FieldRow>
                <FieldRow>
                  <FormikTextField name="email" label="Email" type="email" placeholder="Optional" />
                  <FormikTextField name="phone" label="Phone" type="tel" placeholder="Optional" />
                </FieldRow>
                <FormikTextField name="billing_address_line1" label="Billing address" placeholder="Street address" />
                <FormikTextField
                  name="billing_address_line2"
                  placeholder="Apt, suite (optional)"
                  aria-label="Address line 2"
                />
                <FieldRow min={140}>
                  <FormikTextField name="billing_city" label="City" />
                  <FormikTextField name="billing_state" label="State" />
                  <FormikTextField name="billing_postal_code" label="ZIP code" />
                </FieldRow>
                <FormikTextField
                  name="notes"
                  label="Notes"
                  multiline
                  minRows={2}
                  placeholder="Gate code, preferred contact time…"
                />
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
