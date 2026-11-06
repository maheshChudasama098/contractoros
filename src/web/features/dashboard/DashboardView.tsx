"use client";

import AddOutlined from "@mui/icons-material/AddOutlined";
import ArrowForwardOutlined from "@mui/icons-material/ArrowForwardOutlined";
import CalendarMonthOutlined from "@mui/icons-material/CalendarMonthOutlined";
import CheckCircleOutline from "@mui/icons-material/CheckCircleOutline";
import ErrorOutline from "@mui/icons-material/ErrorOutline";
import HistoryEduOutlined from "@mui/icons-material/HistoryEduOutlined";
import ReceiptLongOutlined from "@mui/icons-material/ReceiptLongOutlined";
import ScheduleOutlined from "@mui/icons-material/ScheduleOutlined";
import TaskAltOutlined from "@mui/icons-material/TaskAltOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { KpiStrip, Muted, PageHeader, Progress, SectionCard, StatusTag } from "@web/components/ui";
import { api } from "@web/lib/api-client";
import { tokens } from "@web/theme/tokens";
import type { DashboardSummary } from "@shared/contracts/dashboard";
import { PROJECT_STATUS_LABELS, type ProjectStatus } from "@shared/contracts/projects";
import { STATUS_TONE } from "@web/features/projects/ProjectsView";
import { usd } from "@web/features/invoices/api";

const day = (ymd: string | null, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }) =>
  ymd ? new Date(`${ymd}T00:00:00`).toLocaleDateString("en-US", opts) : "—";
const time = (hhmm: string | null) => {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map(Number) as [number, number];
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};
const compact = (v: string | number) =>
  Number(v).toLocaleString("en-US", { style: "currency", currency: "USD", notation: Number(v) >= 10_000 ? "compact" : "standard", maximumFractionDigits: Number(v) >= 10_000 ? 1 : 0 });

const ATTENTION_ICON: Record<DashboardSummary["attention"][number]["kind"], ReactNode> = {
  invoice_overdue: <ReceiptLongOutlined sx={{ fontSize: 18, color: tokens.danger }} />,
  task_overdue: <TaskAltOutlined sx={{ fontSize: 18, color: tokens.danger }} />,
  proposal_expiring: <ScheduleOutlined sx={{ fontSize: 18, color: "#B45309" }} />,
  contract_unsigned: <HistoryEduOutlined sx={{ fontSize: 18, color: "#B45309" }} />,
  contract_to_send: <HistoryEduOutlined sx={{ fontSize: 18, color: tokens.brand }} />,
};

export function DashboardView() {
  const [d, setD] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<DashboardSummary>("/dashboard/summary")
      .then(setD)
      .catch((e: Error) => setError(e.message));
  }, []);

  if (!d) return error ? <Alert severity="error">{error}</Alert> : <CircularProgress sx={{ alignSelf: "center", mt: 8 }} />;

  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const kpis = [
    ...(d.projects ? [{ label: "Active projects", value: d.projects.active, hint: d.work?.overdue_tasks ? `${d.work.overdue_tasks} overdue task${d.work.overdue_tasks === 1 ? "" : "s"}` : "No overdue tasks", hintTone: (d.work?.overdue_tasks ? "danger" : "success") as "danger" | "success" }] : []),
    ...(d.money
      ? [
          { label: "Outstanding", value: usd(d.money.outstanding), hint: Number(d.money.overdue) ? `${usd(d.money.overdue)} overdue` : "Nothing overdue", hintTone: (Number(d.money.overdue) ? "danger" : "success") as "danger" | "success" },
          { label: "Collected this month", value: usd(d.money.collected_this_month) },
        ]
      : []),
    ...(d.sales ? [{ label: "Open estimates", value: usd(d.sales.open_estimates_value), hint: `${d.sales.open_estimates} draft or sent` }] : []),
  ];

  return (
    <>
      <PageHeader
        title={`${greet}${d.greeting_name ? `, ${d.greeting_name}` : ""}`}
        subtitle={`${new Date(`${d.today}T00:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} · here's what's happening across your jobs.`}
        actions={
          <Stack direction="row" gap={1}>
            {d.sales && (
              <Button variant="outlined" startIcon={<AddOutlined />} component={Link} href="/estimates?new=1">
                New estimate
              </Button>
            )}
            {d.projects && (
              <Button variant="contained" color="primary" startIcon={<AddOutlined />} component={Link} href="/projects">
                Projects
              </Button>
            )}
          </Stack>
        }
      />

      {kpis.length > 0 && <KpiStrip items={kpis} />}

      <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "minmax(0,1fr)", lg: "minmax(0,1fr) 380px" }, alignItems: "start" }}>
        <Stack gap={3} minWidth={0}>
          <SectionCard title="Needs attention" bodySx={{ p: 0 }}>
            {d.attention.length === 0 ? (
              <Stack direction="row" gap={1.25} alignItems="center" sx={{ px: 2.5, py: 2.5, color: "text.secondary" }}>
                <CheckCircleOutline sx={{ color: "#15803D" }} />
                <Box sx={{ fontSize: 14 }}>You&apos;re all caught up — nothing overdue or waiting on you.</Box>
              </Stack>
            ) : (
              d.attention.map((a, i) => (
                <ButtonBase
                  key={i}
                  component={Link}
                  href={a.href}
                  sx={{
                    width: "100%",
                    justifyContent: "flex-start",
                    gap: 1.5,
                    px: 2.5,
                    py: 1.5,
                    textAlign: "left",
                    borderBottom: i === d.attention.length - 1 ? "none" : `1px solid ${tokens.rowDivider}`,
                    "&:hover": { bgcolor: tokens.surfaceMuted },
                  }}
                >
                  {ATTENTION_ICON[a.kind]}
                  <Stack sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ fontWeight: 500, fontSize: 14 }}>{a.title}</Box>
                    <Muted sx={{ fontSize: 12.5 }}>{a.detail}</Muted>
                  </Stack>
                  <ArrowForwardOutlined sx={{ fontSize: 16, color: "text.disabled" }} />
                </ButtonBase>
              ))
            )}
          </SectionCard>

          {d.projects && (
            <SectionCard
              title="Active projects"
              action={
                <Button size="small" variant="text" component={Link} href="/projects">
                  All projects →
                </Button>
              }
              bodySx={{ p: 0 }}
            >
              {d.projects.list.length === 0 ? (
                <Muted sx={{ px: 2.5, py: 2.5, fontSize: 14 }}>No open projects. Projects start when a contract is signed, or create one from Projects.</Muted>
              ) : (
                d.projects.list.map((p, i) => {
                  const pct = p.tasks_total ? Math.round((p.tasks_done / p.tasks_total) * 100) : 0;
                  return (
                    <ButtonBase
                      key={p.id}
                      component={Link}
                      href={`/projects/${p.id}`}
                      sx={{
                        width: "100%",
                        display: "grid",
                        gridTemplateColumns: { xs: "1fr", sm: "minmax(0,1fr) 120px 160px" },
                        gap: { xs: 1, sm: 2 },
                        alignItems: "center",
                        px: 2.5,
                        py: 1.5,
                        textAlign: "left",
                        borderBottom: i === d.projects!.list.length - 1 ? "none" : `1px solid ${tokens.rowDivider}`,
                        "&:hover": { bgcolor: tokens.surfaceMuted },
                      }}
                    >
                      <Stack sx={{ minWidth: 0 }}>
                        <Box sx={{ fontWeight: 500, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</Box>
                        <Muted sx={{ fontSize: 12.5 }}>
                          {p.project_number} · {p.customer}
                          {p.planned_end_date ? ` · finish ${day(p.planned_end_date)}` : ""}
                        </Muted>
                      </Stack>
                      <Box>
                        <StatusTag tone={STATUS_TONE[p.status as ProjectStatus]}>{PROJECT_STATUS_LABELS[p.status as ProjectStatus]}</StatusTag>
                      </Box>
                      <Stack gap={0.5}>
                        <Progress value={pct} />
                        <Muted sx={{ fontSize: 12 }}>{p.tasks_total ? `${p.tasks_done}/${p.tasks_total} tasks · ${pct}%` : "No tasks yet"}</Muted>
                      </Stack>
                    </ButtonBase>
                  );
                })
              )}
            </SectionCard>
          )}

          {d.money && (
            <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "minmax(0,1fr)", md: "1fr 1fr" } }}>
              <SectionCard title="Collected · last 6 months" bodySx={{ p: 2.5 }}>
                <CollectionsChart data={d.money.collected_by_month} />
              </SectionCard>
              <SectionCard
                title="Unpaid invoices by age"
                action={
                  <Button size="small" variant="text" component={Link} href="/invoices">
                    Invoices →
                  </Button>
                }
                bodySx={{ p: 2.5 }}
              >
                <AgingBars aging={d.money.aging} />
              </SectionCard>
            </Box>
          )}
        </Stack>

        <Stack gap={3} minWidth={0}>
          {d.work && (
            <SectionCard
              title="Next 14 days"
              action={
                <Button size="small" variant="text" component={Link} href="/calendar">
                  Calendar →
                </Button>
              }
              bodySx={{ p: 0 }}
            >
              {d.work.schedule.length === 0 && d.work.due_soon.length === 0 ? (
                <Muted sx={{ px: 2.5, py: 2.5, fontSize: 14 }}>Nothing scheduled or due.</Muted>
              ) : (
                <>
                  {d.work.schedule.map((e) => (
                    <AgendaRow
                      key={e.id}
                      href={`/projects/${e.project.id}?tab=schedule`}
                      date={e.start_date}
                      icon={<CalendarMonthOutlined sx={{ fontSize: 16, color: tokens.brand }} />}
                      title={e.title}
                      sub={`${e.all_day ? "All day" : time(e.start_time)} · ${e.project.project_number}`}
                    />
                  ))}
                  {d.work.due_soon.map((t) => (
                    <AgendaRow
                      key={t.id}
                      href={`/projects/${t.project.id}?tab=tasks`}
                      date={t.due_date}
                      icon={<TaskAltOutlined sx={{ fontSize: 16, color: "#1D4ED8" }} />}
                      title={t.title}
                      sub={`Task due · ${t.project.project_number}`}
                    />
                  ))}
                </>
              )}
            </SectionCard>
          )}

          {d.sales && (
            <SectionCard title="Sales" bodySx={{ p: 0 }}>
              <SalesRow href="/estimates" label="Open estimates" value={`${d.sales.open_estimates}`} sub={usd(d.sales.open_estimates_value)} />
              <SalesRow href="/proposals" label="Proposals waiting on customer" value={`${d.sales.proposals_waiting}`} />
              <SalesRow href="/contracts" label="Contracts awaiting signature" value={`${d.sales.contracts_to_sign}`} />
              <SalesRow
                href="/estimates"
                label="Won · last 90 days"
                value={usd(d.sales.won_90d_value)}
                sub={d.sales.win_rate_90d == null ? "No decisions yet" : `${d.sales.win_rate_90d}% win rate`}
                last
              />
            </SectionCard>
          )}
        </Stack>
      </Box>
    </>
  );
}

function AgendaRow({ href, date, icon, title, sub }: { href: string; date: string; icon: ReactNode; title: string; sub: string }) {
  return (
    <ButtonBase
      component={Link}
      href={href}
      sx={{ width: "100%", justifyContent: "flex-start", gap: 1.5, px: 2.5, py: 1.25, textAlign: "left", borderBottom: `1px solid ${tokens.rowDivider}`, "&:hover": { bgcolor: tokens.surfaceMuted } }}
    >
      <Box sx={{ width: 40, textAlign: "center", flex: "none" }}>
        <Box sx={{ fontSize: 10.5, textTransform: "uppercase", color: "text.secondary", fontWeight: 600 }}>{day(date, { weekday: "short" })}</Box>
        <Box sx={{ fontSize: 17, fontWeight: 700, lineHeight: 1.1 }}>{day(date, { day: "numeric" })}</Box>
      </Box>
      <Stack sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" gap={0.75} alignItems="center">
          {icon}
          <Box sx={{ fontWeight: 500, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</Box>
        </Stack>
        <Muted sx={{ fontSize: 12.5 }}>{sub}</Muted>
      </Stack>
    </ButtonBase>
  );
}

function SalesRow({ href, label, value, sub, last }: { href: string; label: string; value: string; sub?: string; last?: boolean }) {
  return (
    <ButtonBase
      component={Link}
      href={href}
      sx={{ width: "100%", justifyContent: "space-between", gap: 2, px: 2.5, py: 1.5, textAlign: "left", borderBottom: last ? "none" : `1px solid ${tokens.rowDivider}`, "&:hover": { bgcolor: tokens.surfaceMuted } }}
    >
      <Box sx={{ fontSize: 14 }}>{label}</Box>
      <Stack alignItems="flex-end">
        <Box sx={{ fontWeight: 600, fontSize: 15, fontVariantNumeric: "tabular-nums" }}>{value}</Box>
        {sub && <Muted sx={{ fontSize: 12 }}>{sub}</Muted>}
      </Stack>
    </ButtonBase>
  );
}

/** Single-series column chart: one hue, thin columns, hover tooltip per month. */
function CollectionsChart({ data }: { data: { month: string; amount: string }[] }) {
  const max = Math.max(...data.map((m) => Number(m.amount)), 1);
  const total = data.reduce((s, m) => s + Number(m.amount), 0);
  const H = 150;
  return (
    <Stack gap={1.5}>
      <Box>
        <Typography sx={{ fontSize: 22, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{usd(total)}</Typography>
        <Muted sx={{ fontSize: 12.5 }}>Payments received in the last 6 months</Muted>
      </Box>
      <Box role="img" aria-label={`Collections by month: ${data.map((m) => `${day(`${m.month}-01`, { month: "short" })} ${usd(m.amount)}`).join(", ")}`}>
        <Box sx={{ position: "relative", height: H, borderBottom: `1px solid ${tokens.borderStrong}` }}>
          {[0.5, 1].map((f) => (
            <Box key={f} sx={{ position: "absolute", left: 0, right: 0, bottom: H * f, borderTop: `1px dashed ${tokens.rowDivider}` }} />
          ))}
          <Box sx={{ position: "absolute", inset: 0, display: "grid", gridTemplateColumns: `repeat(${data.length}, 1fr)`, alignItems: "end" }}>
            {data.map((m, i) => {
              const v = Number(m.amount);
              const h = v ? Math.max(4, (v / max) * (H - 8)) : 0;
              const current = i === data.length - 1;
              return (
                <Tooltip key={m.month} title={`${day(`${m.month}-01`, { month: "long", year: "numeric" })}: ${usd(v)}`} placement="top" arrow>
                  {/* Hit target is the full column, larger than the bar itself. */}
                  <Box sx={{ height: "100%", display: "flex", alignItems: "flex-end", justifyContent: "center", cursor: "default", "&:hover > div": { opacity: 1 } }}>
                    <Box sx={{ width: "42%", maxWidth: 28, height: h, bgcolor: tokens.brand, opacity: current ? 1 : 0.55, borderRadius: "4px 4px 0 0", transition: "opacity .15s" }} />
                  </Box>
                </Tooltip>
              );
            })}
          </Box>
        </Box>
        <Box sx={{ display: "grid", gridTemplateColumns: `repeat(${data.length}, 1fr)`, mt: 0.75 }}>
          {data.map((m, i) => (
            <Box key={m.month} sx={{ textAlign: "center", fontSize: 11.5, color: i === data.length - 1 ? tokens.ink : "text.secondary", fontWeight: i === data.length - 1 ? 600 : 400 }}>
              {day(`${m.month}-01`, { month: "short" })}
            </Box>
          ))}
        </Box>
      </Box>
      <Muted sx={{ fontSize: 12 }}>
        This month {compact(data[data.length - 1]?.amount ?? 0)} · peak {compact(max === 1 && !total ? 0 : max)}
      </Muted>
    </Stack>
  );
}

const AGE_LABEL: Record<string, string> = { current: "Not due yet", "1-30": "1–30 days late", "31-60": "31–60 days late", "61-90": "61–90 days late", "90+": "90+ days late" };

/** Horizontal bars of unpaid balance by age (magnitude, one hue); labels carry the meaning. */
function AgingBars({ aging }: { aging: NonNullable<DashboardSummary["money"]>["aging"] }) {
  const total = aging.reduce((s, a) => s + Number(a.amount), 0);
  const max = Math.max(...aging.map((a) => Number(a.amount)), 1);
  if (!total)
    return (
      <Stack direction="row" gap={1.25} alignItems="center" sx={{ color: "text.secondary", py: 2 }}>
        <CheckCircleOutline sx={{ color: "#15803D" }} />
        <Box sx={{ fontSize: 14 }}>No unpaid invoices.</Box>
      </Stack>
    );
  return (
    <Stack gap={1.5}>
      <Box>
        <Typography sx={{ fontSize: 22, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{usd(total)}</Typography>
        <Muted sx={{ fontSize: 12.5 }}>Owed to you across unpaid invoices</Muted>
      </Box>
      {aging.map((a) => {
        const v = Number(a.amount);
        const late = a.bucket !== "current";
        return (
          <Tooltip key={a.bucket} title={`${AGE_LABEL[a.bucket]}: ${usd(v)} on ${a.count} invoice${a.count === 1 ? "" : "s"}`} placement="top" arrow>
            <Box sx={{ cursor: "default" }}>
              <Stack direction="row" justifyContent="space-between" sx={{ fontSize: 13, mb: 0.5 }}>
                <Box sx={{ color: "text.secondary", display: "flex", alignItems: "center", gap: 0.5 }}>
                  {late && v > 0 && <ErrorOutline sx={{ fontSize: 14, color: tokens.danger }} />}
                  {AGE_LABEL[a.bucket]}
                </Box>
                <Box sx={{ fontVariantNumeric: "tabular-nums", fontWeight: v ? 600 : 400, color: v ? tokens.ink : "text.disabled" }}>{usd(v)}</Box>
              </Stack>
              <Box sx={{ height: 8, borderRadius: 4, bgcolor: tokens.surfaceMuted, overflow: "hidden" }}>
                <Box sx={{ height: "100%", width: `${(v / max) * 100}%`, bgcolor: tokens.brand, opacity: late ? 1 : 0.55, borderRadius: 4 }} />
              </Box>
            </Box>
          </Tooltip>
        );
      })}
    </Stack>
  );
}
