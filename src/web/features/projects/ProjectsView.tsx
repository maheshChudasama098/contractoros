"use client";

import AddOutlined from "@mui/icons-material/AddOutlined";
import PersonAddAltOutlined from "@mui/icons-material/PersonAddAltOutlined";
import HomeOutlined from "@mui/icons-material/HomeOutlined";
import MoreHorizOutlined from "@mui/icons-material/MoreHorizOutlined";
import Alert from "@mui/material/Alert";
import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormLabel from "@mui/material/FormLabel";
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
import TextField from "@mui/material/TextField";
import { Form, Formik, useFormikContext } from "formik";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ConfirmDialog } from "@web/components/dialogs";
import { FieldRow, FormikSelect, FormikTextField } from "@web/components/form";
import {
  EmptyState,
  FilterSelect,
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
  money,
  type Sort,
  FormDrawer,
} from "@web/components/ui";
import type { ListPage } from "@shared/contracts/api";
import { Yup } from "@web/lib/validation";
import { tokens, type Tone } from "@web/theme/tokens";
import type { CustomerDto } from "@shared/contracts/customers";
import {
  PRIORITIES,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUSES,
  type Priority,
  type ProjectDto,
  type ProjectInput,
  type ProjectStatus,
  type ProjectTab,
} from "@shared/contracts/projects";
import { applyApiError, customersApi } from "@web/features/customers/api";
import { CustomerDialog } from "@web/features/customers/CustomersView";
import { projectsApi } from "./api";

type Tab = ProjectTab;
type SortKey = "name" | "customer" | "planned_start_date" | "contract_value" | "created_at";

export const STATUS_TONE: Record<ProjectStatus, Tone> = {
  planned: "neutral",
  scheduled: "info",
  active: "success",
  on_hold: "warning",
  completed: "brand",
  cancelled: "danger",
};
const PRIORITY_LABEL: Record<Priority, string> = { low: "Low", normal: "Normal", high: "High", urgent: "Urgent" };

const fmtDate = (d: string | null) =>
  d
    ? new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    : null;
const dateRange = (p: ProjectDto) => {
  const s = fmtDate(p.planned_start_date);
  const e = fmtDate(p.planned_end_date);
  return s && e ? `${s} – ${e}` : s ? `Starts ${s}` : e ? `Due ${e}` : null;
};

/** Every editable field, so edits always send the full record (PUT). */
const toInput = (p: ProjectDto): ProjectInput => ({
  name: p.name,
  customer_id: p.customer.id,
  status: p.status,
  priority: p.priority,
  planned_start_date: p.planned_start_date,
  planned_end_date: p.planned_end_date,
  contract_value: p.contract_value,
  site_address_line1: p.site.address_line1,
  site_address_line2: p.site.address_line2,
  site_city: p.site.city,
  site_state: p.site.state,
  site_postal_code: p.site.postal_code,
});

export function ProjectsView() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("open");
  const [q, setQ] = useState("");
  const [query, setQuery] = useState(""); // debounced search term
  const [priority, setPriority] = useState<"all" | Priority>("all");
  const [sort, setSort] = useState<Sort<SortKey>>({ key: "created_at", dir: "desc" });
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(PAGE_SIZES[0]!);
  const [data, setData] = useState<ListPage<ProjectDto, Tab> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ el: HTMLElement; p: ProjectDto } | null>(null);
  const [editing, setEditing] = useState<ProjectDto | "new" | null>(null);
  const [deleting, setDeleting] = useState<ProjectDto | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => (setQuery(q.trim()), setPage(0)), 300);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(() => {
    projectsApi
      .list({
        status: tab,
        q: query || undefined,
        priority,
        sort: sort.key,
        dir: sort.dir,
        page: page + 1,
        per_page: perPage,
      })
      .then((r) => (setData(r), setError(null)))
      .catch((e: Error) => setError(e.message));
  }, [tab, query, priority, sort, page, perPage]);

  const filtered = !!query || priority !== "all";
  const clearFilters = () => (setQ(""), setQuery(""), setPriority("all"), setPage(0));
  const onSort = (s: Sort<SortKey>) => (setSort(s), setPage(0));
  const c = data?.counts;
  useEffect(load, [load]);

  const setStatus = async (p: ProjectDto, status: ProjectStatus) => {
    try {
      await projectsApi.update(p.id, { ...toInput(p), status });
      setToast(`${p.project_number} marked ${PROJECT_STATUS_LABELS[status].toLowerCase()}`);
      load();
    } catch (e) {
      setToast(applyApiError(e, () => {}) ?? "Could not update project");
    }
  };

  return (
    <>
      <PageHeader
        title="Projects"
        subtitle={
          c && !filtered
            ? c.all
              ? `Jobs you're running for your customers · ${c.open} open, ${c.completed} completed`
              : "Jobs you're running for your customers. Create one to start tracking tasks, schedule and costs."
            : "Jobs you're running for your customers."
        }
        actions={
          <Button variant="contained" color="primary" startIcon={<AddOutlined />} onClick={() => setEditing("new")}>
            New project
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
              { value: "open", label: "Open", count: c?.open },
              { value: "completed", label: "Completed", count: c?.completed },
              { value: "cancelled", label: "Cancelled", count: c?.cancelled },
              { value: "all", label: "All", count: c?.all },
            ]}
          />
        }
        filters={
          <>
            <FilterSelect
              label="Priority"
              value={priority}
              onChange={(v) => (setPriority(v), setPage(0))}
              options={[
                { value: "all", label: "All" },
                ...PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABEL[p] })),
              ]}
            />
            {filtered && (
              <Button variant="text" size="small" onClick={clearFilters}>
                Clear
              </Button>
            )}
          </>
        }
        search={
          <SearchField label="Search projects" placeholder="Name, number, customer or city" value={q} onChange={setQ} />
        }
      >
        {data && data.items.length === 0 ? (
          <EmptyState
            icon={<HomeOutlined />}
            title={
              filtered
                ? "No matching projects"
                : tab === "open"
                  ? "No open projects"
                  : `No ${tab === "all" ? "" : tab + " "}projects`
            }
            body={
              filtered
                ? "Try a different search or clear the filters."
                : tab !== "open"
                  ? undefined
                  : "Create a project for a customer to start tracking the work."
            }
            action={
              filtered ? (
                <Button onClick={clearFilters}>Clear filters</Button>
              ) : tab === "open" ? (
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddOutlined />}
                  onClick={() => setEditing("new")}
                >
                  New project
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
                    <SortHead k="name" sort={sort} onSort={onSort}>
                      Project
                    </SortHead>
                    <SortHead k="customer" sort={sort} onSort={onSort}>
                      Customer
                    </SortHead>
                    <SortHead k="planned_start_date" sort={sort} onSort={onSort}>
                      Schedule
                    </SortHead>
                    <TableCell>Status</TableCell>
                    <SortHead k="contract_value" sort={sort} onSort={onSort} align="right">
                      Contract value
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
                  {(data?.items ?? []).map((p) => (
                    <TableRow
                      key={p.id}
                      hover
                      sx={{ cursor: "pointer" }}
                      onClick={() => router.push(`/projects/${p.id}`)}
                    >
                      <TableCell>
                        <TwoLine title={p.name} sub={`${p.project_number} · ${p.site.city}, ${p.site.state}`} />
                      </TableCell>
                      <TableCell>{p.customer.display_name}</TableCell>
                      <TableCell sx={{ color: "text.secondary" }}>
                        {dateRange(p) ?? <Muted>Not scheduled</Muted>}
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" gap={0.75} alignItems="center">
                          <StatusTag tone={STATUS_TONE[p.status]}>{PROJECT_STATUS_LABELS[p.status]}</StatusTag>
                          {(p.priority === "high" || p.priority === "urgent") && (
                            <StatusTag tone="danger" dot={false}>
                              {PRIORITY_LABEL[p.priority]}
                            </StatusTag>
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell align="right" sx={{ typography: "num" }}>
                        {money(Number(p.contract_value))}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          aria-label={`Actions for ${p.name}`}
                          onClick={(e) => (e.stopPropagation(), setMenu({ el: e.currentTarget, p }))}
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
        <MenuItem onClick={() => (setEditing(menu!.p), setMenu(null))}>Edit project</MenuItem>
        {menu && menu.p.status !== "completed" && (
          <MenuItem onClick={() => (setMenu(null), setStatus(menu.p, "completed"))}>Mark completed</MenuItem>
        )}
        {menu && menu.p.status !== "cancelled" && (
          <MenuItem onClick={() => (setMenu(null), setStatus(menu.p, "cancelled"))}>Cancel project</MenuItem>
        )}
        <MenuItem onClick={() => (setDeleting(menu!.p), setMenu(null))} sx={{ color: tokens.danger }}>
          Delete…
        </MenuItem>
      </Menu>

      {editing && (
        <ProjectDialog
          project={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(msg, saved) => {
            setEditing(null);
            // New projects open straight into their detail page.
            if (editing === "new") return router.push(`/projects/${saved.id}`);
            setToast(msg);
            load();
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        destructive
        title={`Delete ${deleting?.name}?`}
        description="This permanently removes the project. Projects with contracts or invoices can only be cancelled."
        confirmLabel="Delete project"
        onConfirm={async () => {
          try {
            await projectsApi.remove(deleting!.id);
            setToast(`${deleting!.project_number} deleted`);
            load();
          } catch (e) {
            setToast(applyApiError(e, () => {}) ?? "Could not delete project");
          }
        }}
      />
      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)} message={toast} />
    </>
  );
}

// ------------------------------------------------------- Add / edit dialog

type ProjectForm = {
  name: string;
  customer_id: string;
  status: ProjectStatus;
  priority: Priority;
  planned_start_date: string;
  planned_end_date: string;
  contract_value: string;
  site_address_line1: string;
  site_address_line2: string;
  site_city: string;
  site_state: string;
  site_postal_code: string;
};

const schema = Yup.object({
  name: Yup.string().trim().required("Project name is required.").max(180),
  customer_id: Yup.string().required("Choose a customer."),
  planned_start_date: Yup.string(),
  planned_end_date: Yup.string().test("after", "End date can't be before the start date.", function (end) {
    const start = this.parent.planned_start_date as string | undefined;
    return !start || !end || end >= start;
  }),
  contract_value: Yup.string()
    .trim()
    .matches(/^\d{1,10}(\.\d{1,2})?$/, {
      message: "Enter an amount like 25000 or 25000.50.",
      excludeEmptyString: true,
    }),
  site_address_line1: Yup.string().trim().required("Job site address is required."),
  site_city: Yup.string().trim().required("City is required."),
  site_state: Yup.string().trim().required("State is required."),
  site_postal_code: Yup.string().trim().required("ZIP code is required."),
});

/** A full customer from search, or just id + name when editing an existing project. */
type CustomerOption = Pick<CustomerDto, "id" | "display_name"> & Partial<CustomerDto>;

const hasBillingAddress = (c: CustomerOption | null) => !!c?.billing_address_line1 && !!c.billing_city;

/** Searchable customer picker (active customers only). Offers to copy the billing address as the job site. */
function CustomerPicker({ initial }: { initial: { id: string; display_name: string } | null }) {
  const { values, setFieldValue, setFieldTouched, touched, errors } = useFormikContext<ProjectForm>();
  const [value, setValue] = useState<CustomerOption | null>(initial);
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<CustomerOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let live = true;
    setLoading(true);
    const t = setTimeout(() => {
      customersApi
        .list({ status: "active", q: input.trim() || undefined, per_page: 20 })
        .then((r) => live && setOptions(r.items))
        .catch(() => live && setOptions([]))
        .finally(() => live && setLoading(false));
    }, 250);
    return () => ((live = false), clearTimeout(t));
  }, [input]);

  const siteEmpty = !values.site_address_line1 && !values.site_city;
  const copyAddress = (c: CustomerOption) => {
    setFieldValue("site_address_line1", c.billing_address_line1 ?? "");
    setFieldValue("site_address_line2", c.billing_address_line2 ?? "");
    setFieldValue("site_city", c.billing_city ?? "");
    setFieldValue("site_state", c.billing_state ?? "");
    setFieldValue("site_postal_code", c.billing_postal_code ?? "");
  };
  const showError = touched.customer_id && !!errors.customer_id;

  const pick = (c: CustomerOption | null) => {
    setValue(c);
    setFieldValue("customer_id", c?.id ?? "");
    if (c && siteEmpty && hasBillingAddress(c)) copyAddress(c);
  };

  return (
    <Stack gap={0.75}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <FormLabel htmlFor="customer_id" error={showError}>
          Customer
        </FormLabel>
        <Button
          size="small"
          variant="text"
          startIcon={<PersonAddAltOutlined />}
          onClick={() => setAdding(true)}
          sx={{ px: 0.5 }}
        >
          New customer
        </Button>
      </Stack>
      <Autocomplete
        id="customer_id"
        value={value}
        options={options}
        loading={loading}
        filterOptions={(x) => x} // server-side search
        getOptionLabel={(o) => o.display_name}
        isOptionEqualToValue={(a, b) => a.id === b.id}
        onInputChange={(_, v, reason) => reason === "input" && setInput(v)}
        onChange={(_, c) => pick(c)}
        onBlur={() => setFieldTouched("customer_id", true)}
        // MUI keys options by label; key by id instead, since two customers can share a name.
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        renderOption={({ key, ...props }, o) => (
          <li key={o.id} {...props}>
            <TwoLine title={o.display_name} sub={[o.email, o.billing_city].filter(Boolean).join(" · ") || undefined} />
          </li>
        )}
        noOptionsText={
          <Stack gap={1} alignItems="flex-start">
            <Box>{input ? "No matching customers" : "No active customers yet"}</Box>
            <Button
              size="small"
              startIcon={<PersonAddAltOutlined />}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setAdding(true)}
            >
              Add new customer
            </Button>
          </Stack>
        }
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder="Search customers"
            error={showError}
            helperText={showError ? errors.customer_id : undefined}
          />
        )}
      />
      {value && hasBillingAddress(value) && !siteEmpty && (
        <Box>
          <Button size="small" variant="text" onClick={() => copyAddress(value)} sx={{ px: 0 }}>
            Use {value.display_name}&apos;s billing address as job site
          </Button>
        </Box>
      )}
      {adding && (
        <CustomerDialog
          customer={null}
          onClose={() => setAdding(false)}
          onSaved={(_, saved) => {
            setAdding(false);
            setOptions((o) => [saved, ...o.filter((x) => x.id !== saved.id)]);
            pick(saved);
          }}
        />
      )}
    </Stack>
  );
}

export function ProjectDialog({
  project,
  onClose,
  onSaved,
}: {
  project: ProjectDto | null;
  onClose: () => void;
  onSaved: (msg: string, saved: ProjectDto) => void;
}) {
  const isNew = !project;
  const initial: ProjectForm = project
    ? {
        name: project.name,
        customer_id: project.customer.id,
        status: project.status,
        priority: project.priority,
        planned_start_date: project.planned_start_date ?? "",
        planned_end_date: project.planned_end_date ?? "",
        contract_value: Number(project.contract_value) ? project.contract_value : "",
        site_address_line1: project.site.address_line1,
        site_address_line2: project.site.address_line2 ?? "",
        site_city: project.site.city,
        site_state: project.site.state,
        site_postal_code: project.site.postal_code,
      }
    : {
        name: "",
        customer_id: "",
        status: "planned",
        priority: "normal",
        planned_start_date: "",
        planned_end_date: "",
        contract_value: "",
        site_address_line1: "",
        site_address_line2: "",
        site_city: "",
        site_state: "",
        site_postal_code: "",
      };

  return (
    <FormDrawer open onClose={onClose}>
      <Formik<ProjectForm>
        initialValues={initial}
        validationSchema={schema}
        onSubmit={async (vals, { setStatus, setFieldError }) => {
          setStatus(null);
          try {
            const saved = isNew ? await projectsApi.create(vals) : await projectsApi.update(project.id, vals);
            onSaved(isNew ? `${saved.project_number} created` : `${saved.project_number} updated`, saved);
          } catch (e) {
            setStatus(applyApiError(e, setFieldError));
          }
        }}
      >
        {({ isSubmitting, status }) => (
          <Form noValidate>
            <DialogTitle>{isNew ? "New project" : `Edit ${project.project_number}`}</DialogTitle>
            <DialogContent>
              <Stack gap={2}>
                {status && <Alert severity="error">{status}</Alert>}
                <CustomerPicker initial={project ? project.customer : null} />
                <FormikTextField name="name" label="Project name" placeholder="Kitchen remodel" />
                <FieldRow>
                  <FormikSelect
                    name="status"
                    label="Status"
                    options={PROJECT_STATUSES.map((s) => ({ value: s, label: PROJECT_STATUS_LABELS[s] }))}
                  />
                  <FormikSelect
                    name="priority"
                    label="Priority"
                    options={PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABEL[p] }))}
                  />
                </FieldRow>
                <FieldRow>
                  <FormikTextField
                    name="planned_start_date"
                    label="Planned start"
                    type="date"
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                  <FormikTextField
                    name="planned_end_date"
                    label="Planned end"
                    type="date"
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                </FieldRow>
                <FormikTextField
                  name="contract_value"
                  label="Contract value (USD)"
                  inputMode="decimal"
                  placeholder="0.00"
                />
                <FormikTextField name="site_address_line1" label="Job site address" placeholder="Street address" />
                <FormikTextField
                  name="site_address_line2"
                  placeholder="Apt, suite (optional)"
                  aria-label="Address line 2"
                />
                <FieldRow min={140}>
                  <FormikTextField name="site_city" label="City" />
                  <FormikTextField name="site_state" label="State" />
                  <FormikTextField name="site_postal_code" label="ZIP code" />
                </FieldRow>
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={onClose}>Cancel</Button>
              <Button type="submit" variant="contained" color="primary" disabled={isSubmitting}>
                {isNew ? "Create project" : "Save changes"}
              </Button>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </FormDrawer>
  );
}
