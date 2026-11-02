"use client";

import AddOutlined from "@mui/icons-material/AddOutlined";
import ChatBubbleOutlineOutlined from "@mui/icons-material/ChatBubbleOutlineOutlined";
import DeleteOutline from "@mui/icons-material/DeleteOutline";
import EmailOutlined from "@mui/icons-material/EmailOutlined";
import PhoneOutlined from "@mui/icons-material/PhoneOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useCallback, useEffect, useState } from "react";
import { InitialsAvatar, Muted, SectionCard, StatusTag } from "@web/components/ui";
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

/** One KPI card with a coloured left edge, like the design. */
function Kpi({ label, value, hint, color }: { label: string; value: string; hint: string; color: string }) {
  return (
    <Box sx={{ bgcolor: "#fff", border: `1px solid ${tokens.border}`, borderLeft: `3px solid ${color}`, borderRadius: "12px", px: 2.25, py: 2 }}>
      <Box sx={{ fontSize: 11.5, fontWeight: 500, letterSpacing: ".04em", textTransform: "uppercase", color: "text.secondary" }}>{label}</Box>
      <Box sx={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em", mt: 0.5, typography: "num" }}>{value}</Box>
      <Muted sx={{ fontSize: 12.5, mt: 0.25 }}>{hint}</Muted>
    </Box>
  );
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <Stack direction="row" justifyContent="space-between" sx={{ py: 1.25, borderBottom: `1px solid ${tokens.rowDivider}`, "&:last-of-type": { borderBottom: 0 } }}>
      <Box sx={{ color: tokens.ink2 }}>{label}</Box>
      <Box sx={{ fontWeight: 600, typography: "num", color }}>{value}</Box>
    </Stack>
  );
}

const linkBtn = { fontSize: 13, fontWeight: 500, px: 0.5, minWidth: 0 } as const;

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

  return (
    <>
      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))" }}>
        <Kpi label="Contract value" value={usd(money.contract_value)} hint="Original contract" color="#1E3A8A" />
        <Kpi
          label="Paid to date"
          value={usd(money.paid)}
          hint={Number(money.paid) ? `${paidPct.toFixed(0)}% of contract` : "Nothing collected yet"}
          color="#16A34A"
        />
        <Kpi
          label="Outstanding"
          value={usd(money.outstanding)}
          hint={Number(money.outstanding) ? "Invoiced, not yet paid" : "Nothing outstanding"}
          color="#F59E0B"
        />
        <Kpi
          label="Tasks complete"
          value={tasks.total ? `${tasks.done} / ${tasks.total}` : "—"}
          hint={tasks.total ? `${Math.round((tasks.done / tasks.total) * 100)}% done` : "No tasks yet"}
          color="#0EA5E9"
        />
      </Box>

      <Box sx={{ display: "grid", gap: 2.5, gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) 380px" }, alignItems: "start" }}>
        <Stack gap={2.5} sx={{ minWidth: 0 }}>
          <SectionCard
            title="Billing & payments"
            action={<Button variant="text" size="small" sx={linkBtn} onClick={() => goTo("finances")}>View finances →</Button>}
            bodySx={{ px: 2.5, py: 2 }}
          >
            <LinearProgress variant="determinate" value={paidPct} color="success" sx={{ height: 8, borderRadius: 4, mb: 1.5, bgcolor: tokens.hover }} />
            <Row label="Project value" value={usd(money.contract_value)} />
            <Row label="Paid" value={usd(money.paid)} color="#16A34A" />
            <Row label="Invoiced, unpaid" value={usd(money.outstanding)} color="#D97706" />
            <Row label="Remaining to bill" value={usd(money.remaining_to_bill)} />
          </SectionCard>

          <SectionCard
            title="Budget health"
            action={<Button variant="text" size="small" sx={linkBtn} onClick={() => goTo("finances")}>Expenses →</Button>}
            bodySx={{ px: 2.5, py: 2 }}
          >
            {contract ? (
              <Stack gap={1}>
                <Stack direction="row" justifyContent="space-between">
                  <Box>
                    Spent <strong>{usd(money.expenses)}</strong> of {usd(money.contract_value)}
                  </Box>
                  <Box sx={{ fontWeight: 600, color: overBudget ? tokens.danger : "text.secondary" }}>
                    {overBudget ? "Over budget" : `${spentPct.toFixed(0)}% used`}
                  </Box>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={spentPct}
                  color={overBudget ? "error" : spentPct > 85 ? "warning" : "primary"}
                  sx={{ height: 8, borderRadius: 4, bgcolor: tokens.hover }}
                />
              </Stack>
            ) : (
              <Muted>Set a contract value on the project to track spending against it.</Muted>
            )}
          </SectionCard>

          <SectionCard
            title="Coming up"
            action={<Button variant="text" size="small" sx={linkBtn} onClick={() => goTo("schedule")}>Full schedule →</Button>}
            bodySx={{ px: 2.5, py: overview.upcoming.length ? 1 : 2 }}
          >
            {overview.upcoming.length ? (
              overview.upcoming.map((e) => (
                <Stack key={e.id} direction="row" gap={2} alignItems="center" sx={{ py: 1.25, borderBottom: `1px solid ${tokens.rowDivider}`, "&:last-of-type": { borderBottom: 0 } }}>
                  <Box sx={{ width: 48, textAlign: "center", flex: "none" }}>
                    <Box sx={{ fontSize: 11, textTransform: "uppercase", color: tokens.brand, fontWeight: 600 }}>{fmtDay(e.start_date, { month: "short" })}</Box>
                    <Box sx={{ fontSize: 20, fontWeight: 600, lineHeight: 1.1 }}>{fmtDay(e.start_date, { day: "numeric" })}</Box>
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
                <Stack key={t.id} direction="row" gap={1.5} alignItems="center" sx={{ py: 1.25, borderBottom: `1px solid ${tokens.rowDivider}`, "&:last-of-type": { borderBottom: 0 } }}>
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

        <Stack gap={2.5} sx={{ minWidth: 0 }}>
          <SectionCard title="Client" bodySx={{ px: 2.5, py: 2 }}>
            <Stack direction="row" gap={1.5} alignItems="center">
              <InitialsAvatar name={customer.display_name} size={40} />
              <Box sx={{ fontWeight: 600 }}>{customer.display_name}</Box>
            </Stack>
            <Stack gap={1} sx={{ mt: 1.75, fontSize: 13.5 }}>
              {customer.email && (
                <Stack direction="row" gap={1} alignItems="center">
                  <EmailOutlined sx={{ fontSize: 17, color: "text.secondary" }} />
                  <a href={`mailto:${customer.email}`}>{customer.email}</a>
                </Stack>
              )}
              {customer.phone && (
                <Stack direction="row" gap={1} alignItems="center">
                  <PhoneOutlined sx={{ fontSize: 17, color: "text.secondary" }} />
                  <a href={`tel:${customer.phone}`}>{customer.phone}</a>
                </Stack>
              )}
              {!customer.email && !customer.phone && <Muted>No contact details on file.</Muted>}
            </Stack>
          </SectionCard>

          <SectionCard title="Project details" bodySx={{ px: 2.5, py: 1 }}>
            <Row label="Project #" value={project.project_number} />
            <Row label="Start" value={fmtDay(project.planned_start_date) || "Not set"} />
            <Row label="Target finish" value={fmtDay(project.planned_end_date) || "Not set"} />
            <Row label="Priority" value={project.priority[0]!.toUpperCase() + project.priority.slice(1)} />
            <Row label="Expenses logged" value={usd(money.expenses)} />
          </SectionCard>

          <NotesCard api={api} onChanged={onChanged} />
        </Stack>
      </Box>
    </>
  );
}

function NotesCard({ api, onChanged }: { api: ProjectDetailApi; onChanged: () => void }) {
  const [notes, setNotes] = useState<NoteDto[] | null>(null);
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
        !adding && (
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
          <Box sx={{ fontSize: 13 }}>No notes yet. Click &quot;Add note&quot; to get started.</Box>
        </Stack>
      )}
      <Stack gap={1.5}>
        {notes?.map((n) => (
          <Box key={n.id} sx={{ bgcolor: tokens.surfaceMuted, border: `1px solid ${tokens.divider}`, borderRadius: "10px", p: 1.5 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
              <Typography sx={{ whiteSpace: "pre-wrap", fontSize: 13.5, flex: 1 }}>{n.body}</Typography>
              <IconButton
                size="small"
                aria-label="Delete note"
                onClick={async () => {
                  await api.deleteNote(n.id).catch(() => {});
                  load();
                }}
              >
                <DeleteOutline sx={{ fontSize: 17 }} />
              </IconButton>
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
