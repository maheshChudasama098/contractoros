"use client";

import AddOutlined from "@mui/icons-material/AddOutlined";
import CalendarMonthOutlined from "@mui/icons-material/CalendarMonthOutlined";
import ChevronLeftOutlined from "@mui/icons-material/ChevronLeftOutlined";
import ChevronRightOutlined from "@mui/icons-material/ChevronRightOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import IconButton from "@mui/material/IconButton";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EmptyState, FilterSelect, Muted, PageHeader, Segmented } from "@web/components/ui";
import { tokens } from "@web/theme/tokens";
import type { CalendarItemDto, CalendarKind } from "@shared/contracts/calendar";
import { TASK_STATUS_LABELS, type TaskStatus } from "@shared/contracts/project-detail";
import { projectsApi } from "@web/features/projects/api";
import { fmtDay, fmtTime, projectDetailApi, todayYmd } from "@web/features/projects/detail/api";
import { EventDialog } from "@web/features/projects/detail/ScheduleTab";
import { calendarApi } from "./api";

type View = "month" | "week" | "list";
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Plain date math on "YYYY-MM-DD" strings (UTC-based so DST never shifts a day).
const ymd = (d: Date) => d.toISOString().slice(0, 10);
const parse = (s: string) => new Date(`${s}T00:00:00Z`);
const addDays = (s: string, n: number) => {
  const d = parse(s);
  d.setUTCDate(d.getUTCDate() + n);
  return ymd(d);
};
const weekStart = (s: string) => addDays(s, -parse(s).getUTCDay());
const monthStart = (s: string) => `${s.slice(0, 7)}-01`;
const shiftMonth = (s: string, n: number) => {
  const d = parse(monthStart(s));
  d.setUTCMonth(d.getUTCMonth() + n);
  return ymd(d);
};
const utcLabel = (s: string, opts: Intl.DateTimeFormatOptions) =>
  parse(s).toLocaleDateString("en-US", { ...opts, timeZone: "UTC" });

/** Colour per kind, from the design tokens. */
const KIND_STYLE: Record<CalendarKind, { bg: string; fg: string; label: string }> = {
  event: { bg: tokens.brandSoft, fg: tokens.brand, label: "Schedule" },
  task: { bg: "#E8EEFB", fg: "#1E40AF", label: "Task due" },
  milestone: { bg: "#E7F5EC", fg: "#166534", label: "Project date" },
};

function Chip({ item, day, onOpen }: { item: CalendarItemDto; day: string; onOpen: (i: CalendarItemDto) => void }) {
  const st = KIND_STYLE[item.kind];
  const done = item.kind === "task" && item.detail === "done";
  return (
    <Box
      onClick={(e) => (e.stopPropagation(), onOpen(item))}
      title={`${item.title} · ${item.project.number} ${item.project.name}`}
      sx={{
        fontSize: 12,
        px: 0.75,
        py: 0.25,
        borderRadius: "5px",
        bgcolor: st.bg,
        color: st.fg,
        fontWeight: 500,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        cursor: "pointer",
        textDecoration: done ? "line-through" : "none",
        "&:hover": { filter: "brightness(0.96)" },
      }}
    >
      {!item.all_day && item.start_date === day ? `${fmtTime(item.start_time)} ` : ""}
      {item.title}
    </Box>
  );
}

export function CalendarView() {
  const router = useRouter();
  const today = todayYmd();
  const [view, setView] = useState<View>("month");
  const [anchor, setAnchor] = useState(today);
  const [projectId, setProjectId] = useState("all");
  const [kind, setKind] = useState<CalendarKind | "all">("all");
  const [projects, setProjects] = useState<{ value: string; label: string }[]>([]);
  const [items, setItems] = useState<CalendarItemDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState<string | null>(null); // default date
  const [editing, setEditing] = useState<CalendarItemDto | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Visible range for the current view.
  const [from, to] = useMemo(() => {
    if (view === "week") return [weekStart(anchor), addDays(weekStart(anchor), 6)];
    if (view === "list") return [monthStart(anchor), addDays(shiftMonth(anchor, 1), -1)];
    const first = weekStart(monthStart(anchor));
    return [first, addDays(first, 41)];
  }, [view, anchor]);

  useEffect(() => {
    projectsApi
      .list({ status: "open", per_page: 100, sort: "name", dir: "asc" })
      .then((r) => setProjects(r.items.map((p) => ({ value: p.id, label: `${p.project_number} · ${p.name}` }))))
      .catch(() => {});
  }, []);

  const load = useCallback(() => {
    calendarApi
      .list({ from, to, kind, project_id: projectId === "all" ? undefined : projectId })
      .then((r) => (setItems(r), setError(null)))
      .catch((e: Error) => setError(e.message));
  }, [from, to, kind, projectId]);
  useEffect(load, [load]);

  const on = (day: string) => (items ?? []).filter((i) => i.start_date <= day && i.end_date >= day);

  const open = (i: CalendarItemDto) => {
    if (i.kind === "event") return setEditing(i);
    router.push(`/projects/${i.project.id}${i.kind === "task" ? "?tab=tasks" : ""}`);
  };

  const step = (n: number) => setAnchor((a) => (view === "week" ? addDays(a, 7 * n) : shiftMonth(a, n)));
  const title =
    view === "week"
      ? `${utcLabel(from, { month: "short", day: "numeric" })} – ${utcLabel(to, { month: "short", day: "numeric", year: "numeric" })}`
      : utcLabel(monthStart(anchor), { month: "long", year: "numeric" });
  const isCurrent = view === "week" ? from <= today && today <= to : monthStart(anchor) === monthStart(today);
  const counts = useMemo(() => {
    const c = { event: 0, task: 0, milestone: 0 };
    for (const i of items ?? []) c[i.kind]++;
    return c;
  }, [items]);

  return (
    <>
      <PageHeader
        title="Calendar"
        subtitle="Schedule items, task due dates and project dates across all your jobs."
        actions={
          <Button variant="contained" color="primary" startIcon={<AddOutlined />} onClick={() => setCreating(today)}>
            New event
          </Button>
        }
      />
      {error && <Alert severity="error">{error}</Alert>}

      <Card sx={{ overflow: "hidden" }}>
        {/* Toolbar: navigation on the left, filters and view on the right */}
        <Stack
          direction="row"
          flexWrap="wrap"
          alignItems="center"
          gap={1}
          sx={{ px: 2.5, py: 1.25, borderBottom: `1px solid ${tokens.divider}` }}
        >
          <IconButton
            aria-label="Previous"
            onClick={() => step(-1)}
            sx={{ border: `1px solid ${tokens.borderStrong}` }}
          >
            <ChevronLeftOutlined />
          </IconButton>
          <IconButton aria-label="Next" onClick={() => step(1)} sx={{ border: `1px solid ${tokens.borderStrong}` }}>
            <ChevronRightOutlined />
          </IconButton>
          <Button onClick={() => setAnchor(today)} disabled={isCurrent}>
            Today
          </Button>
          <Typography variant="h3" sx={{ ml: 1, minWidth: 180 }}>
            {title}
          </Typography>
          <Stack direction="row" flexWrap="wrap" alignItems="center" gap={1} sx={{ ml: "auto" }}>
            <FilterSelect
              label="Project"
              value={projectId}
              onChange={setProjectId}
              options={[{ value: "all", label: "All" }, ...projects]}
            />
            <FilterSelect
              label="Show"
              value={kind}
              onChange={setKind}
              options={[
                { value: "all", label: "Everything" },
                { value: "event", label: "Schedule" },
                { value: "task", label: "Task due dates" },
                { value: "milestone", label: "Project dates" },
              ]}
            />
            <Segmented
              label="Calendar view"
              value={view}
              onChange={setView}
              options={[
                { value: "month", label: "Month" },
                { value: "week", label: "Week" },
                { value: "list", label: "List" },
              ]}
            />
          </Stack>
        </Stack>

        {/* Legend */}
        <Stack
          direction="row"
          gap={2}
          flexWrap="wrap"
          sx={{ px: 2.5, py: 1, fontSize: 12.5, color: "text.secondary", borderBottom: `1px solid ${tokens.divider}` }}
        >
          {(Object.keys(KIND_STYLE) as CalendarKind[]).map((k) => (
            <Stack key={k} direction="row" gap={0.75} alignItems="center">
              <Box sx={{ width: 10, height: 10, borderRadius: "3px", bgcolor: KIND_STYLE[k].fg }} />
              {KIND_STYLE[k].label} {items ? `(${counts[k]})` : ""}
            </Stack>
          ))}
        </Stack>

        {view === "month" && (
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}>
            {WEEKDAYS.map((d) => (
              <Box
                key={d}
                sx={{
                  py: 1,
                  textAlign: "center",
                  fontSize: 12.5,
                  color: "text.secondary",
                  bgcolor: tokens.surfaceMuted,
                  borderBottom: `1px solid ${tokens.divider}`,
                }}
              >
                {d}
              </Box>
            ))}
            {Array.from({ length: 42 }, (_, i) => addDays(from, i)).map((day, i) => {
              const inMonth = day.slice(0, 7) === anchor.slice(0, 7);
              const isToday = day === today;
              const list = on(day);
              return (
                <Box
                  key={day}
                  onClick={() => setCreating(day)}
                  sx={{
                    minHeight: { xs: 76, md: 118 },
                    p: 0.75,
                    cursor: "pointer",
                    bgcolor: isToday ? "#FEF9E7" : "#fff",
                    borderRight: (i + 1) % 7 ? `1px solid ${tokens.divider}` : 0,
                    borderBottom: i < 35 ? `1px solid ${tokens.divider}` : 0,
                    "&:hover": { bgcolor: isToday ? "#FCF3D4" : tokens.surfaceMuted },
                  }}
                >
                  <Box
                    sx={{
                      textAlign: "right",
                      fontSize: 13,
                      fontWeight: isToday ? 700 : 400,
                      color: inMonth ? tokens.ink : tokens.subtle,
                      mb: 0.5,
                    }}
                  >
                    {Number(day.slice(8))}
                  </Box>
                  <Stack gap={0.5}>
                    {list.slice(0, 3).map((it) => (
                      <Chip key={it.key} item={it} day={day} onOpen={open} />
                    ))}
                    {list.length > 3 && (
                      <Box
                        component="button"
                        type="button"
                        onClick={(e) => (e.stopPropagation(), setAnchor(day), setView("week"))}
                        sx={{
                          all: "unset",
                          fontSize: 11.5,
                          pl: 0.5,
                          color: tokens.brand,
                          cursor: "pointer",
                          fontWeight: 500,
                        }}
                      >
                        +{list.length - 3} more
                      </Box>
                    )}
                  </Stack>
                </Box>
              );
            })}
          </Box>
        )}

        {view === "week" && (
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(7, minmax(0, 1fr))" } }}>
            {Array.from({ length: 7 }, (_, i) => addDays(from, i)).map((day, i) => {
              const isToday = day === today;
              const list = on(day);
              return (
                <Box
                  key={day}
                  onClick={() => setCreating(day)}
                  sx={{
                    minHeight: { md: 420 },
                    cursor: "pointer",
                    borderRight: { md: i < 6 ? `1px solid ${tokens.divider}` : 0 },
                    borderBottom: { xs: `1px solid ${tokens.divider}`, md: 0 },
                    bgcolor: isToday ? "#FEF9E7" : "#fff",
                    "&:hover": { bgcolor: isToday ? "#FCF3D4" : tokens.surfaceMuted },
                  }}
                >
                  <Box
                    sx={{
                      px: 1.25,
                      py: 1,
                      borderBottom: `1px solid ${tokens.divider}`,
                      bgcolor: isToday ? "#FCF3D4" : tokens.surfaceMuted,
                    }}
                  >
                    <Box sx={{ fontSize: 12, color: "text.secondary" }}>{WEEKDAYS[i]}</Box>
                    <Box sx={{ fontSize: 18, fontWeight: isToday ? 700 : 600 }}>{Number(day.slice(8))}</Box>
                  </Box>
                  <Stack gap={0.75} sx={{ p: 1 }}>
                    {list.map((it) => (
                      <Box key={it.key} onClick={(e) => (e.stopPropagation(), open(it))} sx={{ cursor: "pointer" }}>
                        <Chip item={it} day={day} onOpen={open} />
                        <Muted
                          sx={{
                            fontSize: 11.5,
                            pl: 0.75,
                            mt: 0.25,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {it.all_day ? "All day" : `${fmtTime(it.start_time)} – ${fmtTime(it.end_time)}`} ·{" "}
                          {it.project.number}
                        </Muted>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              );
            })}
          </Box>
        )}

        {view === "list" &&
          (items && items.length === 0 ? (
            <EmptyState
              icon={<CalendarMonthOutlined />}
              title="Nothing this month"
              body="Schedule items, task due dates and project dates will show here."
            />
          ) : (
            <AgendaList items={items ?? []} today={today} onOpen={open} />
          ))}
      </Card>

      {creating && (
        <EventDialog
          api={null}
          projects={projects}
          event={null}
          defaultDate={creating}
          onClose={() => setCreating(null)}
          onSaved={(msg) => (setCreating(null), setToast(msg), load())}
        />
      )}
      {editing?.event && (
        <EventDialog
          api={projectDetailApi(editing.project.id)}
          event={editing.event}
          defaultDate={editing.start_date}
          onClose={() => setEditing(null)}
          onSaved={(msg) => (setEditing(null), setToast(msg), load())}
        />
      )}
      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)} message={toast} />
    </>
  );
}

/** Agenda grouped by day; multi-day items appear on their first day. */
function AgendaList({
  items,
  today,
  onOpen,
}: {
  items: CalendarItemDto[];
  today: string;
  onOpen: (i: CalendarItemDto) => void;
}) {
  const days = useMemo(() => {
    const m = new Map<string, CalendarItemDto[]>();
    for (const i of items) m.set(i.start_date, [...(m.get(i.start_date) ?? []), i]);
    return [...m.entries()];
  }, [items]);
  return (
    <Box>
      {days.map(([day, list]) => (
        <Stack
          key={day}
          direction={{ xs: "column", sm: "row" }}
          sx={{ borderBottom: `1px solid ${tokens.rowDivider}` }}
        >
          <Box
            sx={{ width: { sm: 150 }, flex: "none", px: 2.5, py: 1.5, bgcolor: day === today ? "#FEF9E7" : undefined }}
          >
            <Box sx={{ fontWeight: 600 }}>{fmtDay(day, { weekday: "short", month: "short", day: "numeric" })}</Box>
            {day === today && <Box sx={{ fontSize: 12, color: tokens.brand, fontWeight: 500 }}>Today</Box>}
          </Box>
          <Stack sx={{ flex: 1, minWidth: 0 }}>
            {list.map((i) => {
              const st = KIND_STYLE[i.kind];
              return (
                <Stack
                  key={i.key}
                  direction="row"
                  gap={1.5}
                  alignItems="center"
                  onClick={() => onOpen(i)}
                  sx={{ px: 2.5, py: 1.25, cursor: "pointer", "&:hover": { bgcolor: tokens.surfaceMuted } }}
                >
                  <Box sx={{ width: 4, alignSelf: "stretch", borderRadius: 2, bgcolor: st.fg, flex: "none" }} />
                  <Box sx={{ width: 110, flex: "none", fontSize: 13, color: "text.secondary" }}>
                    {i.all_day ? "All day" : `${fmtTime(i.start_time)} – ${fmtTime(i.end_time)}`}
                  </Box>
                  <Stack sx={{ minWidth: 0, flex: 1 }}>
                    <Box
                      sx={{
                        fontWeight: 500,
                        textDecoration: i.kind === "task" && i.detail === "done" ? "line-through" : "none",
                      }}
                    >
                      {i.title}
                    </Box>
                    <Muted sx={{ fontSize: 12.5 }}>
                      {st.label}
                      {i.kind === "task" && i.detail
                        ? ` · ${TASK_STATUS_LABELS[i.detail as TaskStatus] ?? i.detail}`
                        : ""}
                      {i.end_date !== i.start_date
                        ? ` · until ${fmtDay(i.end_date, { month: "short", day: "numeric" })}`
                        : ""}
                      {" · "}
                      {i.project.number} {i.project.name}
                    </Muted>
                  </Stack>
                </Stack>
              );
            })}
          </Stack>
        </Stack>
      ))}
    </Box>
  );
}
