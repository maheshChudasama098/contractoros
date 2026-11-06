"use client";

import AddOutlined from "@mui/icons-material/AddOutlined";
import ChatBubbleOutlineOutlined from "@mui/icons-material/ChatBubbleOutlineOutlined";
import DeleteOutline from "@mui/icons-material/DeleteOutline";
import EmailOutlined from "@mui/icons-material/EmailOutlined";
import PhoneOutlined from "@mui/icons-material/PhoneOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useProjectAccess } from "./access";
import { useCallback, useEffect, useState } from "react";
import { InitialsAvatar, KpiStrip, Muted, SectionCard, StatusTag } from "@web/components/ui";
import { tokens, type Tone } from "@web/theme/tokens";
import { TASK_STATUS_LABELS, type NoteDto, type ProjectOverview, type TaskStatus } from "@shared/contracts/project-detail";
import { applyApiError } from "@web/features/customers/api";
import { fmtDay, fmtTime, fmtWhen, usd, type ProjectDetailApi } from "./api";
import type { Tab } from "./ProjectDetailView";

export const TASK_TONE: Record<TaskStatus, Tone> = {
  todo: "neutral",
  in_progress: "info",
  blocked: "danger",
  done: "success",
  cancelled: "neutral",
};

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <Stack direction="row" justifyContent="space-between" sx={{ py: 1.25, borderBottom: `1px solid ${tokens.rowDivider}`, "&:last-of-type": { borderBottom: 0 } }}>
      <Box sx={{ color: tokens.ink2 }}>{label}</Box>
      <Box sx={{ fontWeight: 600, typography: "num", color }}>{value}</Box>
    </Stack>
  );
}

/** Label over value, for the summary card's facts. */
function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Stack gap={0.25} sx={{ minWidth: 0 }}>
      <Box sx={{ fontSize: 12, color: "text.secondary" }}>{label}</Box>
      <Box sx={{ fontSize: 14, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis" }}>{children}</Box>
    </Stack>
  );
}

const linkBtn = { fontSize: 13, fontWeight: 500, px: 0.5, minWidth: 0 } as const;
const cap = (s: string) => s[0]!.toUpperCase() + s.slice(1);

export function OverviewTab({
  overview,
  api,
  goTo,
  onChanged,
}: {
  overview: ProjectOverview;
  api: ProjectDetailApi;
  goTo: (t: Tab) => void;
  onChanged: () => void;
}) {
  const { project, money, tasks, customer } = overview;
  const contract = Number(money.contract_value);
  const paidPct = contract ? Math.min(100, (Number(money.paid) / contract) * 100) : 0;
  const spentPct = contract ? Math.min(100, (Number(money.expenses) / contract) * 100) : 0;
  const overBudget = contract > 0 && Number(money.expenses) > contract;
  const taskPct = tasks.total ? Math.round((tasks.done / tasks.total) * 100) : 0;

  return (
    <>
      {/* Summary: who, where, when */}
      <Card sx={{ p: 2.5 }}>
        <Box sx={{ display: "grid", gap: 2.5, gridTemplateColumns: { xs: "1fr", md: "minmax(240px, 1.2fr) repeat(3, minmax(0, 1fr))" }, alignItems: "center" }}>
          <Stack direction="row" gap={1.5} alignItems="center" sx={{ minWidth: 0 }}>
            <InitialsAvatar name={customer.display_name} size={44} />
            <Stack sx={{ minWidth: 0 }}>
              <Box sx={{ fontSize: 12, color: "text.secondary" }}>Client</Box>
              <Box sx={{ fontWeight: 600, fontSize: 15 }}>{customer.display_name}</Box>
              <Stack direction="row" gap={1.5} sx={{ fontSize: 13, flexWrap: "wrap" }}>
                {customer.email && (
                  <Stack direction="row" gap={0.5} alignItems="center" component="a" href={`mailto:${customer.email}`}>
                    <EmailOutlined sx={{ fontSize: 15 }} />
                    {customer.email}
                  </Stack>
                )}
                {customer.phone && (
                  <Stack direction="row" gap={0.5} alignItems="center" component="a" href={`tel:${customer.phone}`}>
                    <PhoneOutlined sx={{ fontSize: 15 }} />
                    {customer.phone}
                  </Stack>
                )}
              </Stack>
            </Stack>
          </Stack>
          <Fact label="Start">{fmtDay(project.planned_start_date) || "Not set"}</Fact>
          <Fact label="Target finish">{fmtDay(project.planned_end_date) || "Not set"}</Fact>
          <Fact label="Priority">{cap(project.priority)}</Fact>
        </Box>
      </Card>

      <KpiStrip
        items={[
          { label: "Contract value", value: usd(money.contract_value), hint: `${usd(money.remaining_to_bill)} left to bill` },
          {
            label: "Collected",
            value: usd(money.paid),
            hint: Number(money.paid) ? `${paidPct.toFixed(0)}% of contract` : "Nothing collected yet",
            hintTone: Number(money.paid) ? "success" : undefined,
          },
          {
            label: "Spent",
            value: usd(money.expenses),
            hint: overBudget ? "Over the contract value" : contract ? `${spentPct.toFixed(0)}% of contract` : "No contract value set",
            hintTone: overBudget ? "danger" : undefined,
          },
          { label: "Tasks", value: tasks.total ? `${tasks.done}/${tasks.total}` : "—", hint: tasks.total ? `${taskPct}% complete` : "No tasks yet" },
        ]}
      />

      <Box sx={{ display: "grid", gap: 2.5, gridTemplateColumns: { xs: "1fr", lg: "repeat(2, minmax(0, 1fr))" }, alignItems: "start" }}>
        <SectionCard
          title="Money"
          action={<Button variant="text" size="small" sx={linkBtn} onClick={() => goTo("budget")}>Open budget →</Button>}
          bodySx={{ px: 2.5, py: 2 }}
        >
          <Stack gap={0.75} sx={{ mb: 1.5 }}>
            <Stack direction="row" justifyContent="space-between" sx={{ fontSize: 12.5, color: "text.secondary" }}>
              <span>Collected</span>
              <span>{paidPct.toFixed(0)}%</span>
            </Stack>
            <LinearProgress variant="determinate" value={paidPct} color="success" sx={{ height: 6, borderRadius: 3, bgcolor: tokens.hover }} />
            <Stack direction="row" justifyContent="space-between" sx={{ fontSize: 12.5, color: "text.secondary", mt: 0.75 }}>
              <span>Spent</span>
              <span style={{ color: overBudget ? tokens.danger : undefined }}>{overBudget ? "Over budget" : `${spentPct.toFixed(0)}%`}</span>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={spentPct}
              color={overBudget ? "error" : spentPct > 85 ? "warning" : "primary"}
              sx={{ height: 6, borderRadius: 3, bgcolor: tokens.hover }}
            />
          </Stack>
          <Row label="Invoiced" value={usd(money.invoiced)} />
          <Row label="Collected" value={usd(money.paid)} color="#16A34A" />
          <Row label="Invoiced, unpaid" value={usd(money.outstanding)} color={Number(money.outstanding) ? "#D97706" : undefined} />
          <Row label="Expenses" value={usd(money.expenses)} />
        </SectionCard>

        <Stack gap={2.5} sx={{ minWidth: 0 }}>
          <SectionCard
            title="Coming up"
            action={<Button variant="text" size="small" sx={linkBtn} onClick={() => goTo("schedule")}>Schedule →</Button>}
            bodySx={{ px: 2.5, py: overview.upcoming.length ? 1 : 2 }}
          >
            {overview.upcoming.length ? (
              overview.upcoming.map((e) => (
                <Stack key={e.id} direction="row" gap={2} alignItems="center" sx={{ py: 1.1, borderBottom: `1px solid ${tokens.rowDivider}`, "&:last-of-type": { borderBottom: 0 } }}>
                  <Box sx={{ width: 44, textAlign: "center", flex: "none", bgcolor: tokens.brandSoft, borderRadius: "8px", py: 0.5 }}>
                    <Box sx={{ fontSize: 10.5, textTransform: "uppercase", color: tokens.brand, fontWeight: 600 }}>{fmtDay(e.start_date, { month: "short" })}</Box>
                    <Box sx={{ fontSize: 17, fontWeight: 600, lineHeight: 1.1 }}>{fmtDay(e.start_date, { day: "numeric" })}</Box>
                  </Box>
                  <Stack sx={{ minWidth: 0 }}>
                    <Box sx={{ fontWeight: 500 }}>{e.title}</Box>
                    <Muted sx={{ fontSize: 12.5 }}>
                      {e.all_day ? "All day" : `${fmtTime(e.start_time)} – ${fmtTime(e.end_time)}`}
                      {e.end_date !== e.start_date ? ` · until ${fmtDay(e.end_date, { month: "short", day: "numeric" })}` : ""}
                    </Muted>
                  </Stack>
                </Stack>
              ))
            ) : (
              <Muted>Nothing scheduled ahead.</Muted>
            )}
          </SectionCard>

          <SectionCard
            title="Open tasks"
            action={<Button variant="text" size="small" sx={linkBtn} onClick={() => goTo("tasks")}>All tasks →</Button>}
            bodySx={{ px: 2.5, py: overview.open_tasks.length ? 1 : 2 }}
          >
            {overview.open_tasks.length ? (
              overview.open_tasks.map((t) => (
                <Stack key={t.id} direction="row" gap={1.5} alignItems="center" sx={{ py: 1.1, borderBottom: `1px solid ${tokens.rowDivider}`, "&:last-of-type": { borderBottom: 0 } }}>
                  <Stack sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ fontWeight: 500 }}>{t.title}</Box>
                    <Muted sx={{ fontSize: 12.5 }}>
                      {[t.assignee?.name ?? "Unassigned", t.due_date ? `Due ${fmtDay(t.due_date, { month: "short", day: "numeric" })}` : null].filter(Boolean).join(" · ")}
                    </Muted>
                  </Stack>
                  <StatusTag tone={TASK_TONE[t.status]}>{TASK_STATUS_LABELS[t.status]}</StatusTag>
                </Stack>
              ))
            ) : (
              <Muted>{tasks.total ? "No open tasks. Nice." : "No tasks yet."}</Muted>
            )}
          </SectionCard>
        </Stack>
      </Box>

      <NotesCard api={api} onChanged={onChanged} />
    </>
  );
}

function NotesCard({ api, onChanged }: { api: ProjectDetailApi; onChanged: () => void }) {
  const [notes, setNotes] = useState<NoteDto[] | null>(null);
  const access = useProjectAccess();
  const [adding, setAdding] = useState(false);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api.notes().then(setNotes).catch((e: Error) => setError(e.message));
  }, [api]);
  useEffect(load, [load]);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.addNote(body);
      setBody("");
      setAdding(false);
      load();
      onChanged();
    } catch (e) {
      setError(applyApiError(e, (_, m) => setError(m)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SectionCard
      title="Project notes"
      action={
        !adding && access.edit && (
          <Button variant="text" size="small" startIcon={<AddOutlined />} sx={linkBtn} onClick={() => setAdding(true)}>
            Add note
          </Button>
        )
      }
      bodySx={{ px: 2.5, py: 2 }}
    >
      {adding && (
        <Stack gap={1} sx={{ mb: 2 }}>
          <TextField
            multiline
            minRows={3}
            autoFocus
            placeholder="Write a note for your team…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            error={!!error}
            helperText={error ?? undefined}
          />
          <Stack direction="row" justifyContent="flex-end" gap={1}>
            <Button onClick={() => (setAdding(false), setBody(""), setError(null))}>Cancel</Button>
            <Button variant="contained" color="primary" disabled={!body.trim() || busy} onClick={save}>
              Save note
            </Button>
          </Stack>
        </Stack>
      )}
      {notes && notes.length === 0 && !adding && (
        <Stack alignItems="center" gap={1} sx={{ py: 3, bgcolor: tokens.surfaceMuted, borderRadius: "10px", color: "text.secondary" }}>
          <ChatBubbleOutlineOutlined sx={{ fontSize: 20 }} />
          <Box sx={{ fontSize: 13 }}>{access.edit ? <>No notes yet. Click &quot;Add note&quot; to get started.</> : "No notes yet."}</Box>
        </Stack>
      )}
      <Stack gap={1.5}>
        {notes?.map((n) => (
          <Box key={n.id} sx={{ bgcolor: tokens.surfaceMuted, border: `1px solid ${tokens.divider}`, borderRadius: "10px", p: 1.5 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
              <Typography sx={{ whiteSpace: "pre-wrap", fontSize: 13.5, flex: 1 }}>{n.body}</Typography>
              {access.edit && <IconButton
                size="small"
                aria-label="Delete note"
                onClick={async () => {
                  await api.deleteNote(n.id).catch(() => {});
                  load();
                }}
              >
                <DeleteOutline sx={{ fontSize: 17 }} />
              </IconButton>}
            </Stack>
            <Muted sx={{ fontSize: 12, mt: 0.5 }}>
              {n.author ?? "Someone"} · {fmtWhen(n.created_at)}
            </Muted>
          </Box>
        ))}
      </Stack>
    </SectionCard>
  );
}
