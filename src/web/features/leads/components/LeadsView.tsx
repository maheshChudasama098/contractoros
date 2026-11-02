"use client";

import AddOutlined from "@mui/icons-material/AddOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { InitialsAvatar, Muted, Num, PageHeader, SearchField, Segmented, StatusTag, Toolbar, TwoLine, money } from "@web/components/ui";
import { LEAD_STAGES, leads, type Lead } from "@web/mocks/data";
import { tokens } from "@web/theme/tokens";
import { NewLeadDrawer } from "./NewLeadDrawer";

const leadHref = (l: Lead) => l.href ?? `/leads/${l.id}`;

function LeadCard({ lead }: { lead: Lead }) {
  return (
    <Box
      component={Link}
      href={leadHref(lead)}
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 0.75,
        p: 1.5,
        bgcolor: "#fff",
        border: `1px solid ${tokens.border}`,
        borderRadius: "10px",
        boxShadow: "0 1px 2px rgba(16,24,40,.04)",
        color: tokens.ink,
        "&:hover": { borderColor: "#C9C7BF", color: tokens.ink },
      }}
    >
      <Stack direction="row" justifyContent="space-between" gap={1}>
        <Box sx={{ fontWeight: 500 }}>{lead.name}</Box>
        <Num sx={{ fontSize: 13 }}>{money(lead.value)}</Num>
      </Stack>
      <Muted sx={{ fontSize: 13 }}>
        {lead.project} · {lead.area}
      </Muted>
      {lead.note && <Box sx={{ fontSize: 12.5, color: tokens.ink2 }}>{lead.note}</Box>}
      {lead.tag ? (
        <Box>
          <StatusTag tone={lead.tag.tone}>{lead.tag.label}</StatusTag>
        </Box>
      ) : (
        lead.stage !== "Lost" && (
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 0.5 }}>
            {lead.followUp?.due ? (
              <StatusTag tone="danger">{lead.followUp.label}</StatusTag>
            ) : (
              <Box component="span" sx={{ fontSize: 12, px: 1, height: 22, display: "inline-flex", alignItems: "center", borderRadius: "6px", bgcolor: "#F0EFEB", color: "#4A4E57" }}>
                {lead.followUp?.label ?? lead.source}
              </Box>
            )}
            <Box title={lead.owner}>
              <InitialsAvatar name={lead.owner} size={24} />
            </Box>
          </Stack>
        )
      )}
    </Box>
  );
}

export function LeadsView() {
  const params = useSearchParams();
  const [view, setView] = useState<"board" | "list">("board");
  const [q, setQ] = useState("");
  const [dueOnly, setDueOnly] = useState(false);
  const [drawer, setDrawer] = useState(params.get("new") === "1");
  const [toast, setToast] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return leads.filter((l) => (!t || `${l.name} ${l.project} ${l.area}`.toLowerCase().includes(t)) && (!dueOnly || l.followUp?.due));
  }, [q, dueOnly]);

  return (
    <>
      <PageHeader
        title="Leads"
        subtitle={
          <>
            <Num>$459,000</Num> open across 7 leads · 2 follow-ups due today
          </>
        }
        actions={
          <>
            <Segmented label="View" value={view} onChange={setView} options={[{ value: "board", label: "Board" }, { value: "list", label: "List" }]} />
            <Button variant="contained" color="primary" startIcon={<AddOutlined />} onClick={() => setDrawer(true)}>
              New lead
            </Button>
          </>
        }
      />
      <Toolbar>
        <SearchField label="Filter leads" placeholder="Filter by name, phone, project…" value={q} onChange={setQ} />
        <Button>Owner: Anyone</Button>
        <Button>Source: All</Button>
        <Button aria-pressed={dueOnly} onClick={() => setDueOnly((d) => !d)} sx={dueOnly ? { borderColor: tokens.ink, bgcolor: tokens.hover } : undefined}>
          Follow-up due
        </Button>
      </Toolbar>

      {view === "board" ? (
        <Box sx={{ display: "grid", gridAutoFlow: "column", gridAutoColumns: { xs: "minmax(260px, 85%)", md: "minmax(220px, 1fr)" }, gap: 1.5, overflowX: "auto", pb: 1 }}>
          {LEAD_STAGES.map((stage) => {
            const col = filtered.filter((l) => l.stage === stage);
            return (
              <Stack key={stage} component="section" aria-label={stage} gap={1} sx={{ bgcolor: "#EFEEEA", borderRadius: "12px", p: 1, minHeight: 200 }}>
                <Stack direction="row" alignItems="baseline" gap={1} sx={{ px: 0.75, py: 0.5 }}>
                  <Typography variant="h3" sx={{ fontSize: 13.5 }}>
                    {stage}
                  </Typography>
                  <Num sx={{ fontSize: 12, color: "text.secondary" }}>{col.length}</Num>
                  <Num sx={{ fontSize: 12, color: "text.secondary", ml: "auto" }}>{money(col.reduce((a, l) => a + l.value, 0))}</Num>
                </Stack>
                {col.map((l) => (
                  <LeadCard key={l.id} lead={l} />
                ))}
              </Stack>
            );
          })}
        </Box>
      ) : (
        <Card>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Lead</TableCell>
                  <TableCell>Stage</TableCell>
                  <TableCell>Source</TableCell>
                  <TableCell>Owner</TableCell>
                  <TableCell>Follow-up</TableCell>
                  <TableCell align="right">Value</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((l) => (
                  <TableRow key={l.id} hover>
                    <TableCell>
                      <TwoLine title={l.name} sub={`${l.project} · ${l.area}`} href={leadHref(l)} />
                    </TableCell>
                    <TableCell>
                      <StatusTag tone={l.stage === "Won" ? "success" : l.stage === "Lost" ? "neutral" : "info"}>{l.stage}</StatusTag>
                    </TableCell>
                    <TableCell>{l.source}</TableCell>
                    <TableCell>{l.owner}</TableCell>
                    <TableCell>{l.followUp ? l.followUp.due ? <StatusTag tone="danger">{l.followUp.label}</StatusTag> : l.followUp.label : <Muted>—</Muted>}</TableCell>
                    <TableCell align="right">
                      <Num>{money(l.value)}</Num>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      <NewLeadDrawer open={drawer} onClose={() => setDrawer(false)} onCreated={(n) => setToast(`Lead created: ${n}`)} />
      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)} message={toast} />
    </>
  );
}
