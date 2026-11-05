"use client";

import MarkEmailReadOutlined from "@mui/icons-material/MarkEmailReadOutlined";
import Alert from "@mui/material/Alert";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { EmptyState, ListCard, Muted, PAGE_SIZES, PageHeader, Pager, SearchField, StatusTag, TabBar, TwoLine } from "@web/components/ui";
import { PROPOSAL_STATUS_LABELS, type ProposalListItem, type ProposalTab } from "@shared/contracts/proposals";
import { usd } from "@web/features/invoices/api";
import { PROPOSAL_TONE, fmtDay, proposalsApi } from "./api";

const TABS: { value: ProposalTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Waiting on customer" },
  { value: "accepted", label: "Accepted" },
  { value: "declined", label: "Declined" },
  { value: "closed", label: "Expired / withdrawn" },
];

export function ProposalsView() {
  const router = useRouter();
  const [tab, setTab] = useState<ProposalTab>("all");
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(PAGE_SIZES[1]!);
  const [data, setData] = useState<Awaited<ReturnType<typeof proposalsApi.list>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => (setQuery(q.trim()), setPage(0)), 300);
    return () => clearTimeout(t);
  }, [q]);
  const load = useCallback(() => {
    proposalsApi
      .list({ tab, q: query || undefined, page: page + 1, per_page: perPage })
      .then((r) => (setData(r), setError(null)))
      .catch((e: Error) => setError(e.message));
  }, [tab, query, page, perPage]);
  useEffect(load, [load]);
  const c = data?.counts;

  const sub = (p: ProposalListItem) =>
    p.status === "accepted"
      ? `Accepted ${fmtDay(p.accepted_at)}`
      : p.status === "sent"
        ? `${p.viewed_at ? "Opened" : "Not opened yet"} · expires ${fmtDay(p.expires_at)}`
        : null;

  return (
    <>
      <PageHeader
        title="Proposals"
        subtitle={
          c?.all
            ? `Estimates sent to customers to accept online · ${c.open} waiting on the customer`
            : "Estimates you've sent to customers to accept online. Send one from an issued estimate."
        }
      />
      {error && <Alert severity="error">{error}</Alert>}
      <ListCard
        tabs={<TabBar label="Status" value={tab} onChange={(t) => (setTab(t), setPage(0))} items={TABS.map((t) => ({ ...t, count: c?.[t.value] }))} />}
        search={<SearchField label="Search proposals" placeholder="Proposal #, estimate or customer" value={q} onChange={setQ} />}
      >
        {data && data.items.length === 0 ? (
          <EmptyState
            icon={<MarkEmailReadOutlined />}
            title={query ? "No matching proposals" : "No proposals here"}
            body={query ? "Try a different search." : "Open an issued estimate and choose “Send proposal”."}
          />
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Proposal</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Sent</TableCell>
                    <TableCell align="right">Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(data?.items ?? []).map((p) => (
                    <TableRow
                      key={p.id}
                      hover
                      sx={{ cursor: "pointer" }}
                      onClick={() => router.push(p.contract_id ? `/contracts/${p.contract_id}` : `/estimates/${p.estimate.id}`)}
                    >
                      <TableCell>
                        <TwoLine title={p.estimate.title} sub={`${p.proposal_number} · ${p.estimate.estimate_number} v${p.estimate.version_number}`} />
                      </TableCell>
                      <TableCell>{p.customer.display_name}</TableCell>
                      <TableCell>
                        <StatusTag tone={PROPOSAL_TONE[p.status]}>{PROPOSAL_STATUS_LABELS[p.status]}</StatusTag>
                        {sub(p) && <Muted sx={{ fontSize: 12, mt: 0.5 }}>{sub(p)}</Muted>}
                      </TableCell>
                      <TableCell sx={{ color: "text.secondary", whiteSpace: "nowrap" }}>{fmtDay(p.sent_at)}</TableCell>
                      <TableCell align="right" sx={{ typography: "num", fontWeight: 500 }}>
                        {usd(p.total)}
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
    </>
  );
}
