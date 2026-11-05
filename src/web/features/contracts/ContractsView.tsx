"use client";

import HistoryEduOutlined from "@mui/icons-material/HistoryEduOutlined";
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
import { CONTRACT_STATUS_LABELS, type ContractTab } from "@shared/contracts/proposals";
import { usd } from "@web/features/invoices/api";
import { CONTRACT_TONE, contractsApi, fmtDay } from "@web/features/estimates/api";

const TABS: { value: ContractTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "draft", label: "To send" },
  { value: "pending_signature", label: "Awaiting signature" },
  { value: "signed", label: "Signed" },
  { value: "voided", label: "Voided" },
];

export function ContractsView() {
  const router = useRouter();
  const [tab, setTab] = useState<ContractTab>("all");
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(PAGE_SIZES[1]!);
  const [data, setData] = useState<Awaited<ReturnType<typeof contractsApi.list>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => (setQuery(q.trim()), setPage(0)), 300);
    return () => clearTimeout(t);
  }, [q]);
  const load = useCallback(() => {
    contractsApi
      .list({ tab, q: query || undefined, page: page + 1, per_page: perPage })
      .then((r) => (setData(r), setError(null)))
      .catch((e: Error) => setError(e.message));
  }, [tab, query, page, perPage]);
  useEffect(load, [load]);
  const c = data?.counts;

  return (
    <>
      <PageHeader
        title="Contracts"
        subtitle={
          c?.all
            ? `Agreements your customers sign online · ${c.draft} to send, ${c.pending_signature} awaiting signature`
            : "A contract is created when a customer accepts a proposal. Send it for an online signature, then start the project."
        }
      />
      {error && <Alert severity="error">{error}</Alert>}
      <ListCard
        tabs={<TabBar label="Status" value={tab} onChange={(t) => (setTab(t), setPage(0))} items={TABS.map((t) => ({ ...t, count: c?.[t.value] }))} />}
        search={<SearchField label="Search contracts" placeholder="Contract #, title or customer" value={q} onChange={setQ} />}
      >
        {data && data.items.length === 0 ? (
          <EmptyState
            icon={<HistoryEduOutlined />}
            title={query ? "No matching contracts" : "No contracts here"}
            body={query ? "Try a different search." : "Contracts appear here when a customer accepts a proposal."}
          />
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Contract</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Signed</TableCell>
                    <TableCell align="right">Value</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(data?.items ?? []).map((k) => (
                    <TableRow key={k.id} hover sx={{ cursor: "pointer" }} onClick={() => router.push(`/contracts/${k.id}`)}>
                      <TableCell>
                        <TwoLine title={k.title} sub={k.contract_number} />
                      </TableCell>
                      <TableCell>
                        <TwoLine title={k.customer.display_name} sub={k.project ? `${k.project.project_number} · ${k.project.name}` : undefined} />
                      </TableCell>
                      <TableCell>
                        <StatusTag tone={CONTRACT_TONE[k.status]}>{CONTRACT_STATUS_LABELS[k.status]}</StatusTag>
                      </TableCell>
                      <TableCell sx={{ color: "text.secondary", whiteSpace: "nowrap" }}>{k.signed_at ? fmtDay(k.signed_at) : <Muted>—</Muted>}</TableCell>
                      <TableCell align="right" sx={{ typography: "num", fontWeight: 500 }}>
                        {usd(k.contract_value)}
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
