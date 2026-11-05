"use client";

import AddOutlined from "@mui/icons-material/AddOutlined";
import ReceiptLongOutlined from "@mui/icons-material/ReceiptLongOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  EmptyState,
  FilterSelect,
  KpiStrip,
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
import {
  INVOICE_STATUS_LABELS,
  INVOICE_TYPE_LABELS,
  INVOICE_TYPES,
  type InvoiceListPage,
  type InvoiceSort,
  type InvoiceTab,
  type InvoiceType,
} from "@shared/contracts/invoices";
import { INVOICE_TONE, fmtDate, invoicesApi, usd } from "./api";
import { InvoiceDrawer, type InvoicePrefill } from "./InvoiceDrawer";

const TAB_LABELS: Record<InvoiceTab, string> = {
  all: "All",
  outstanding: "Outstanding",
  overdue: "Overdue",
  draft: "Drafts",
  paid: "Paid",
  void: "Void",
};

export function InvoicesView() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [tab, setTab] = useState<InvoiceTab>("all");
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [type, setType] = useState<"all" | InvoiceType>("all");
  const [sort, setSort] = useState<Sort<InvoiceSort>>({ key: "issue_date", dir: "desc" });
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(PAGE_SIZES[1]!);
  const [data, setData] = useState<InvoiceListPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState<InvoicePrefill | null>(null);

  // /invoices?new=1&customer=<id>&customer_name=<name>&project=<id> opens the form prefilled (from a project).
  useEffect(() => {
    if (params.get("new") !== "1") return;
    const id = params.get("customer");
    setCreating({
      customer: id ? { id, display_name: params.get("customer_name") ?? "" } : undefined,
      project_id: params.get("project") ?? undefined,
    });
    router.replace(pathname, { scroll: false });
  }, [params, pathname, router]);

  useEffect(() => {
    const t = setTimeout(() => (setQuery(q.trim()), setPage(0)), 300);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(() => {
    invoicesApi
      .list({ tab, q: query || undefined, type, sort: sort.key, dir: sort.dir, page: page + 1, per_page: perPage })
      .then((r) => (setData(r), setError(null)))
      .catch((e: Error) => setError(e.message));
  }, [tab, query, type, sort, page, perPage]);
  useEffect(load, [load]);

  const filtered = !!query || type !== "all";
  const clearFilters = () => (setQ(""), setQuery(""), setType("all"), setPage(0));
  const onSort = (s: Sort<InvoiceSort>) => (setSort(s), setPage(0));
  const c = data?.counts;
  const s = data?.summary;
  const canWrite = !!data?.can_write;

  return (
    <>
      <PageHeader
        title="Invoices"
        subtitle={
          c && !filtered && c.all
            ? `Bill customers and track what's been paid · ${c.outstanding} outstanding${c.overdue ? `, ${c.overdue} overdue` : ""}`
            : "Bill customers for deposits, progress and final payments, and track what's been paid."
        }
        actions={
          canWrite && (
            <Button variant="contained" color="primary" startIcon={<AddOutlined />} onClick={() => setCreating({})}>
              New invoice
            </Button>
          )
        }
      />
      {error && <Alert severity="error">{error}</Alert>}

      {s && (
        <KpiStrip
          items={[
            { label: "Outstanding", value: usd(s.outstanding), hint: `${c?.outstanding ?? 0} unpaid invoice${c?.outstanding === 1 ? "" : "s"}` },
            {
              label: "Overdue",
              value: usd(s.overdue),
              hint: c?.overdue ? `${c.overdue} past due` : "Nothing past due",
              hintTone: c?.overdue ? "danger" : "success",
            },
            { label: "Collected · last 30 days", value: usd(s.paid_30d) },
            { label: "Drafts", value: s.drafts, hint: s.drafts ? "Not sent to customers yet" : undefined },
          ]}
        />
      )}

      <ListCard
        tabs={
          <TabBar
            label="Status"
            value={tab}
            onChange={(t) => (setTab(t), setPage(0))}
            items={(["all", "outstanding", "overdue", "draft", "paid", "void"] as InvoiceTab[]).map((t) => ({
              value: t,
              label: TAB_LABELS[t],
              count: c?.[t],
            }))}
          />
        }
        search={<SearchField label="Search invoices" placeholder="Invoice #, customer or project" value={q} onChange={setQ} />}
        filters={
          <>
            <FilterSelect
              label="Type"
              value={type}
              onChange={(v) => (setType(v), setPage(0))}
              options={[{ value: "all", label: "All" }, ...INVOICE_TYPES.map((t) => ({ value: t, label: INVOICE_TYPE_LABELS[t] }))]}
            />
            {filtered && (
              <Button variant="text" size="small" onClick={clearFilters}>
                Clear
              </Button>
            )}
          </>
        }
      >
        {data && data.items.length === 0 ? (
          <EmptyState
            icon={<ReceiptLongOutlined />}
            title={filtered ? "No matching invoices" : tab === "all" ? "No invoices yet" : `No ${TAB_LABELS[tab].toLowerCase()} invoices`}
            body={
              filtered
                ? "Try a different search or clear the filters."
                : tab === "all"
                  ? "Create an invoice for a deposit, progress payment or the final bill."
                  : undefined
            }
            action={
              filtered ? (
                <Button onClick={clearFilters}>Clear filters</Button>
              ) : tab === "all" && canWrite ? (
                <Button variant="contained" color="primary" startIcon={<AddOutlined />} onClick={() => setCreating({})}>
                  New invoice
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
                    <SortHead k="invoice_number" sort={sort} onSort={onSort}>
                      Invoice
                    </SortHead>
                    <SortHead k="customer" sort={sort} onSort={onSort}>
                      Customer
                    </SortHead>
                    <SortHead k="issue_date" sort={sort} onSort={onSort}>
                      Date
                    </SortHead>
                    <SortHead k="due_date" sort={sort} onSort={onSort}>
                      Due
                    </SortHead>
                    <TableCell>Status</TableCell>
                    <SortHead k="total" sort={sort} onSort={onSort} align="right">
                      Total
                    </SortHead>
                    <SortHead k="balance_due" sort={sort} onSort={onSort} align="right">
                      Balance
                    </SortHead>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(data?.items ?? []).map((i) => (
                    <TableRow key={i.id} hover sx={{ cursor: "pointer" }} onClick={() => router.push(`/invoices/${i.id}`)}>
                      <TableCell>
                        <TwoLine title={i.invoice_number} sub={INVOICE_TYPE_LABELS[i.invoice_type]} />
                      </TableCell>
                      <TableCell>
                        <TwoLine title={i.customer.display_name} sub={i.project ? `${i.project.project_number} · ${i.project.name}` : undefined} />
                      </TableCell>
                      <TableCell sx={{ color: "text.secondary", whiteSpace: "nowrap" }}>{fmtDate(i.issue_date)}</TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        <Box sx={{ color: i.status === "overdue" ? "error.main" : "text.secondary" }}>{fmtDate(i.due_date)}</Box>
                        {i.days_overdue ? <Muted sx={{ fontSize: 12, color: "error.main" }}>{i.days_overdue} days late</Muted> : null}
                      </TableCell>
                      <TableCell>
                        <StatusTag tone={INVOICE_TONE[i.status]}>{INVOICE_STATUS_LABELS[i.status]}</StatusTag>
                      </TableCell>
                      <TableCell align="right" sx={{ typography: "num" }}>
                        {usd(i.total)}
                      </TableCell>
                      <TableCell align="right" sx={{ typography: "num", fontWeight: Number(i.balance_due) ? 600 : 400 }}>
                        {i.status === "void" || i.status === "draft" ? <Muted>—</Muted> : usd(i.balance_due)}
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

      {creating && (
        <InvoiceDrawer
          invoice={null}
          prefill={creating}
          onClose={() => setCreating(null)}
          onSaved={(inv) => (setCreating(null), router.push(`/invoices/${inv.id}`))}
        />
      )}
    </>
  );
}
