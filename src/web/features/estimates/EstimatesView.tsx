"use client";

import AddOutlined from "@mui/icons-material/AddOutlined";
import RequestQuoteOutlined from "@mui/icons-material/RequestQuoteOutlined";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
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
  ESTIMATE_STATUS_LABELS,
  type EstimateListPage,
  type EstimateSort,
  type EstimateTab,
} from "@shared/contracts/estimates";
import { usd } from "@web/features/invoices/api";
import { ESTIMATE_TONE, estimatesApi, fmtDay } from "./api";
import { EstimateDrawer } from "./EstimateDrawer";

const TABS: { value: EstimateTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "draft", label: "Drafts" },
  { value: "issued", label: "Issued" },
  { value: "accepted", label: "Accepted" },
  { value: "declined", label: "Declined" },
];

export function EstimatesView() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [tab, setTab] = useState<EstimateTab>("all");
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort<EstimateSort>>({ key: "created_at", dir: "desc" });
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(PAGE_SIZES[1]!);
  const [data, setData] = useState<EstimateListPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState<{ customer?: { id: string; display_name: string }; project_id?: string } | null>(null);

  // /estimates?new=1&customer=..&customer_name=..&project=.. opens the form prefilled.
  useEffect(() => {
    if (params.get("new") !== "1") return;
    const id = params.get("customer");
    setCreating({ customer: id ? { id, display_name: params.get("customer_name") ?? "" } : undefined, project_id: params.get("project") ?? undefined });
    router.replace(pathname, { scroll: false });
  }, [params, pathname, router]);

  useEffect(() => {
    const t = setTimeout(() => (setQuery(q.trim()), setPage(0)), 300);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(() => {
    estimatesApi
      .list({ tab, q: query || undefined, sort: sort.key, dir: sort.dir, page: page + 1, per_page: perPage })
      .then((r) => (setData(r), setError(null)))
      .catch((e: Error) => setError(e.message));
  }, [tab, query, sort, page, perPage]);
  useEffect(load, [load]);

  const onSort = (s: Sort<EstimateSort>) => (setSort(s), setPage(0));
  const c = data?.counts;
  const s = data?.summary;

  return (
    <>
      <PageHeader
        title="Estimates"
        subtitle={
          c && c.all && !query
            ? `Price jobs and send them as proposals · ${c.open} open, ${c.accepted} accepted`
            : "Price a job line by line, then send it to the customer as a proposal to accept online."
        }
        actions={
          data?.can_write && (
            <Button variant="contained" color="primary" startIcon={<AddOutlined />} onClick={() => setCreating({})}>
              New estimate
            </Button>
          )
        }
      />
      {error && <Alert severity="error">{error}</Alert>}

      {s && (
        <KpiStrip
          items={[
            { label: "Open estimates", value: usd(s.open_value), hint: `${c?.open ?? 0} draft or issued` },
            { label: "Won · last 90 days", value: usd(s.accepted_value_90d) },
            {
              label: "Win rate · last 90 days",
              value: s.win_rate_90d == null ? "—" : `${s.win_rate_90d}%`,
              hint: s.win_rate_90d == null ? "No decisions yet" : "Accepted vs. declined",
            },
          ]}
        />
      )}

      <ListCard
        tabs={<TabBar label="Status" value={tab} onChange={(t) => (setTab(t), setPage(0))} items={TABS.map((t) => ({ ...t, count: c?.[t.value] }))} />}
        search={<SearchField label="Search estimates" placeholder="Estimate #, title or customer" value={q} onChange={setQ} />}
      >
        {data && data.items.length === 0 ? (
          <EmptyState
            icon={<RequestQuoteOutlined />}
            title={query ? "No matching estimates" : tab === "all" ? "No estimates yet" : `No ${TABS.find((t) => t.value === tab)!.label.toLowerCase()} estimates`}
            body={query ? "Try a different search." : tab === "all" ? "Create an estimate with labor, materials and your costs to see the margin." : undefined}
            action={
              !query && tab === "all" && data.can_write ? (
                <Button variant="contained" color="primary" startIcon={<AddOutlined />} onClick={() => setCreating({})}>
                  New estimate
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
                    <SortHead k="estimate_number" sort={sort} onSort={onSort}>
                      Estimate
                    </SortHead>
                    <SortHead k="customer" sort={sort} onSort={onSort}>
                      Customer
                    </SortHead>
                    <TableCell>Status</TableCell>
                    <SortHead k="valid_until" sort={sort} onSort={onSort}>
                      Valid until
                    </SortHead>
                    <SortHead k="created_at" sort={sort} onSort={onSort}>
                      Created
                    </SortHead>
                    <SortHead k="total" sort={sort} onSort={onSort} align="right">
                      Total
                    </SortHead>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(data?.items ?? []).map((e) => (
                    <TableRow key={e.id} hover sx={{ cursor: "pointer" }} onClick={() => router.push(`/estimates/${e.id}`)}>
                      <TableCell>
                        <TwoLine title={e.title} sub={`${e.estimate_number} · v${e.version_number}`} />
                      </TableCell>
                      <TableCell>
                        <TwoLine title={e.customer.display_name} sub={e.project ? `${e.project.project_number} · ${e.project.name}` : undefined} />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" gap={0.75} alignItems="center">
                          <StatusTag tone={ESTIMATE_TONE[e.status]}>{ESTIMATE_STATUS_LABELS[e.status]}</StatusTag>
                          {e.has_draft && e.status !== "draft" && (
                            <StatusTag tone="neutral" dot={false}>
                              Revising
                            </StatusTag>
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ color: e.status === "expired" ? "warning.main" : "text.secondary", whiteSpace: "nowrap" }}>
                        {e.valid_until ? fmtDay(e.valid_until) : <Muted>—</Muted>}
                      </TableCell>
                      <TableCell sx={{ color: "text.secondary", whiteSpace: "nowrap" }}>{fmtDay(e.created_at)}</TableCell>
                      <TableCell align="right" sx={{ typography: "num", fontWeight: 500 }}>
                        {usd(e.total)}
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
        <EstimateDrawer
          estimate={null}
          canCost={!!data?.can_view_cost}
          prefill={creating}
          onClose={() => setCreating(null)}
          onSaved={(e) => (setCreating(null), router.push(`/estimates/${e.id}`))}
        />
      )}
    </>
  );
}
