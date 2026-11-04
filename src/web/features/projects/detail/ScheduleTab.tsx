"use client";

import AddOutlined from "@mui/icons-material/AddOutlined";
import CalendarMonthOutlined from "@mui/icons-material/CalendarMonthOutlined";
import ChevronLeftOutlined from "@mui/icons-material/ChevronLeftOutlined";
import ChevronRightOutlined from "@mui/icons-material/ChevronRightOutlined";
import ViewListOutlined from "@mui/icons-material/ViewListOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Form, Formik } from "formik";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ConfirmDialog } from "@web/components/dialogs";
import { FieldRow, FormikSwitch, FormikTextField } from "@web/components/form";
import { EmptyState, Muted, SectionCard, Segmented } from "@web/components/ui";
import { Yup } from "@web/lib/validation";
import { tokens } from "@web/theme/tokens";
import type { ProjectEventDto, ProjectEventInput } from "@shared/contracts/project-detail";
import { applyApiError } from "@web/features/customers/api";
import { fmtDay, fmtTime, todayYmd, type ProjectDetailApi } from "./api";

type View = "month" | "list";
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Plain date math on "YYYY-MM-DD" strings (UTC-based so DST never shifts a day).
const ymd = (d: Date) => d.toISOString().slice(0, 10);
const parse = (s: string) => new Date(`${s}T00:00:00Z`);
const addDays = (s: string, n: number) => {
  const d = parse(s);
  d.setUTCDate(d.getUTCDate() + n);
  return ymd(d);
};

/** 6-week grid (Sun–Sat) covering the month of `anchor`. */
function monthGrid(anchor: string) {
  const first = parse(`${anchor.slice(0, 7)}-01`);
  const start = addDays(ymd(first), -first.getUTCDay());
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

export function ScheduleTab({ api, onChanged }: { api: ProjectDetailApi; onChanged: () => void }) {
  const today = todayYmd();
  const [view, setView] = useState<View>("month");
  const [anchor, setAnchor] = useState(today);
  const [events, setEvents] = useState<ProjectEventDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<ProjectEventDto | { start_date: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const days = useMemo(() => monthGrid(anchor), [anchor]);
  // Month view loads the visible grid; list view loads the next 6 months.
  const [from, to] = view === "month" ? [days[0]!, days[41]!] : [today, addDays(today, 183)];

  const load = useCallback(() => {
    api
      .events(from, to)
      .then((e) => (setEvents(e), setError(null)))
      .catch((e: Error) => setError(e.message));
  }, [api, from, to]);
  useEffect(load, [load]);
  const refresh = () => (load(), onChanged());

  const month = anchor.slice(0, 7);
  const shiftMonth = (n: number) => {
    const d = parse(`${month}-01`);
    d.setUTCMonth(d.getUTCMonth() + n);
    setAnchor(ymd(d));
  };
  const on = (day: string) => (events ?? []).filter((e) => e.start_date <= day && e.end_date >= day);

  return (
    <>
      <Stack direction="row" alignItems="center" justifyContent="flex-end" flexWrap="wrap" gap={1.5}>
        <Stack direction="row" gap={1.5} alignItems="center">
          <Segmented
            label="Schedule view"
            value={view}
            onChange={setView}
            options={[
              { value: "month", label: <Stack direction="row" gap={0.75} alignItems="center"><CalendarMonthOutlined sx={{ fontSize: 17 }} />Calendar</Stack> },
              { value: "list", label: <Stack direction="row" gap={0.75} alignItems="center"><ViewListOutlined sx={{ fontSize: 17 }} />List</Stack> },
            ]}
          />
          <Button variant="contained" color="primary" startIcon={<AddOutlined />} onClick={() => setEditing({ start_date: today })}>
            Create
          </Button>
        </Stack>
      </Stack>
      {error && <Alert severity="error">{error}</Alert>}

      {view === "month" ? (
        <SectionCard bodySx={{ p: 2 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }} gap={1}>
            <Stack direction="row" gap={0.5}>
              <IconButton aria-label="Previous month" onClick={() => shiftMonth(-1)} sx={{ border: `1px solid ${tokens.border}`, borderRadius: "8px" }}>
                <ChevronLeftOutlined />
              </IconButton>
              <IconButton aria-label="Next month" onClick={() => shiftMonth(1)} sx={{ border: `1px solid ${tokens.border}`, borderRadius: "8px" }}>
                <ChevronRightOutlined />
              </IconButton>
              <Button onClick={() => setAnchor(today)} disabled={month === today.slice(0, 7)}>
                Today
              </Button>
            </Stack>
            <Typography sx={{ fontSize: 18, fontWeight: 600 }}>
              {parse(`${month}-01`).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })}
            </Typography>
            <Box sx={{ width: { xs: 0, sm: 160 } }} />
          </Stack>

          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", border: `1px solid ${tokens.border}`, borderRadius: "10px", overflow: "hidden" }}>
            {WEEKDAYS.map((d) => (
              <Box key={d} sx={{ py: 1, textAlign: "center", fontSize: 12.5, color: "text.secondary", bgcolor: tokens.surfaceMuted, borderBottom: `1px solid ${tokens.border}` }}>
                {d}
              </Box>
            ))}
            {days.map((day, i) => {
              const inMonth = day.slice(0, 7) === month;
              const isToday = day === today;
              const items = on(day);
              return (
                <Box
                  key={day}
                  onClick={() => setEditing({ start_date: day })}
                  sx={{
                    minHeight: { xs: 72, md: 108 },
                    p: 0.75,
                    cursor: "pointer",
                    bgcolor: isToday ? "#FEF9E7" : "#fff",
                    borderRight: (i + 1) % 7 ? `1px solid ${tokens.divider}` : 0,
                    borderBottom: i < 35 ? `1px solid ${tokens.divider}` : 0,
                    "&:hover": { bgcolor: isToday ? "#FCF3D4" : tokens.surfaceMuted },
                  }}
                >
                  <Box sx={{ textAlign: "right", fontSize: 13, fontWeight: isToday ? 700 : 400, color: inMonth ? tokens.ink : tokens.subtle, mb: 0.5 }}>
                    {Number(day.slice(8))}
                  </Box>
                  <Stack gap={0.5}>
                    {items.slice(0, 3).map((e) => (
                      <Box
                        key={e.id}
                        onClick={(ev) => (ev.stopPropagation(), setEditing(e))}
                        title={e.title}
                        sx={{
                          fontSize: 12,
                          px: 0.75,
                          py: 0.25,
                          borderRadius: "5px",
                          bgcolor: tokens.brandSoft,
                          color: tokens.brand,
                          fontWeight: 500,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {!e.all_day && e.start_date === day ? `${fmtTime(e.start_time)} ` : ""}
                        {e.title}
                      </Box>
                    ))}
                    {items.length > 3 && <Muted sx={{ fontSize: 11.5, pl: 0.5 }}>+{items.length - 3} more</Muted>}
                  </Stack>
                </Box>
              );
            })}
          </Box>
        </SectionCard>
      ) : (
        <SectionCard title="Upcoming (next 6 months)">
          {events && events.length === 0 ? (
            <EmptyState icon={<CalendarMonthOutlined />} title="Nothing scheduled" body="Add site visits, inspections and work days." />
          ) : (
            (events ?? []).map((e) => (
              <Stack
                key={e.id}
                direction="row"
                gap={2}
                alignItems="center"
                onClick={() => setEditing(e)}
                sx={{ px: 2.5, py: 1.5, cursor: "pointer", borderBottom: `1px solid ${tokens.rowDivider}`, "&:hover": { bgcolor: tokens.surfaceMuted } }}
              >
                <Box sx={{ width: 52, textAlign: "center", flex: "none" }}>
                  <Box sx={{ fontSize: 11, textTransform: "uppercase", color: tokens.brand, fontWeight: 600 }}>{fmtDay(e.start_date, { month: "short" })}</Box>
                  <Box sx={{ fontSize: 22, fontWeight: 600, lineHeight: 1.1 }}>{fmtDay(e.start_date, { day: "numeric" })}</Box>
                </Box>
                <Stack sx={{ minWidth: 0, flex: 1 }}>
                  <Box sx={{ fontWeight: 500 }}>{e.title}</Box>
                  <Muted sx={{ fontSize: 12.5 }}>
                    {fmtDay(e.start_date, { weekday: "short", month: "short", day: "numeric" })}
                    {e.end_date !== e.start_date ? ` – ${fmtDay(e.end_date, { weekday: "short", month: "short", day: "numeric" })}` : ""}
                    {" · "}
                    {e.all_day ? "All day" : `${fmtTime(e.start_time)} – ${fmtTime(e.end_time)}`}
                  </Muted>
                </Stack>
              </Stack>
            ))
          )}
        </SectionCard>
      )}

      {editing && (
        <EventDialog
          api={api}
          event={"id" in editing ? editing : null}
          defaultDate={editing.start_date}
          onClose={() => setEditing(null)}
          onSaved={(msg) => (setEditing(null), setToast(msg), refresh())}
        />
      )}
      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)} message={toast} />
    </>
  );
}

type EventForm = { title: string; start_date: string; end_date: string; all_day: boolean; start_time: string; end_time: string; notes: string };

function EventDialog({
  api,
  event,
  defaultDate,
  onClose,
  onSaved,
}: {
  api: ProjectDetailApi;
  event: ProjectEventDto | null;
  defaultDate: string;
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const isNew = !event;
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <Formik<EventForm>
        initialValues={{
          title: event?.title ?? "",
          start_date: event?.start_date ?? defaultDate,
          end_date: event?.end_date ?? defaultDate,
          all_day: event?.all_day ?? true,
          start_time: event?.start_time ?? "08:00",
          end_time: event?.end_time ?? "17:00",
          notes: event?.notes ?? "",
        }}
        validationSchema={Yup.object({
          title: Yup.string().trim().required("Title is required.").max(180),
          start_date: Yup.string().required("Start date is required."),
          end_date: Yup.string()
            .required("End date is required.")
            .test("after", "End date can't be before the start date.", function (v) {
              return !v || v >= this.parent.start_date;
            }),
          end_time: Yup.string().test("after", "End time must be after the start time.", function (v) {
            const p = this.parent as EventForm;
            return p.all_day || p.end_date > p.start_date || (!!v && v > p.start_time);
          }),
        })}
        onSubmit={async (vals, { setStatus, setFieldError }) => {
          setStatus(null);
          const input: ProjectEventInput = vals;
          try {
            if (isNew) await api.createEvent(input);
            else await api.updateEvent(event.id, input);
            onSaved(isNew ? `"${vals.title}" scheduled` : "Schedule updated");
          } catch (e) {
            setStatus(applyApiError(e, setFieldError));
          }
        }}
      >
        {({ values, isSubmitting, status, setFieldValue }) => (
          <Form noValidate>
            <DialogTitle>{isNew ? "Add to schedule" : "Edit schedule item"}</DialogTitle>
            <DialogContent>
              <Stack gap={2}>
                {status && <Alert severity="error">{status}</Alert>}
                <FormikTextField name="title" label="Title" placeholder="Demo day, Inspection, Cabinet install…" autoFocus />
                <FieldRow>
                  <FormikTextField
                    name="start_date"
                    label="Start date"
                    type="date"
                    onChange={(e) => {
                      const v = e.target.value;
                      setFieldValue("start_date", v);
                      if (v && values.end_date < v) setFieldValue("end_date", v);
                    }}
                  />
                  <FormikTextField name="end_date" label="End date" type="date" />
                </FieldRow>
                <FormikSwitch name="all_day" label="All day" />
                {!values.all_day && (
                  <FieldRow>
                    <FormikTextField name="start_time" label="Start time" type="time" />
                    <FormikTextField name="end_time" label="End time" type="time" />
                  </FieldRow>
                )}
                <FormikTextField name="notes" label="Notes" multiline minRows={2} placeholder="Optional" />
              </Stack>
            </DialogContent>
            <DialogActions sx={{ justifyContent: "space-between" }}>
              <Box>
                {!isNew && (
                  <Button color="error" onClick={() => setConfirmDelete(true)}>
                    Delete
                  </Button>
                )}
              </Box>
              <Stack direction="row" gap={1}>
                <Button onClick={onClose}>Cancel</Button>
                <Button type="submit" variant="contained" color="primary" disabled={isSubmitting}>
                  {isNew ? "Add" : "Save changes"}
                </Button>
              </Stack>
            </DialogActions>
          </Form>
        )}
      </Formik>
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        destructive
        title={`Delete "${event?.title}"?`}
        confirmLabel="Delete"
        onConfirm={async () => {
          await api.deleteEvent(event!.id);
          onSaved("Removed from schedule");
        }}
      />
    </Dialog>
  );
}
