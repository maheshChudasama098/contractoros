"use client";

import AddOutlined from "@mui/icons-material/AddOutlined";
import ChevronLeftOutlined from "@mui/icons-material/ChevronLeftOutlined";
import ChevronRightOutlined from "@mui/icons-material/ChevronRightOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Form, Formik } from "formik";
import { useState } from "react";
import { FieldRow, FormikSelect, FormikTextField } from "@web/components/form";
import { Muted, Num, SectionCard, Segmented } from "@web/components/ui";
import { Yup } from "@web/lib/validation";
import { tokens } from "@web/theme/tokens";

type P = "p1" | "p2" | "p3" | "p4";
const PCOLOR: Record<P, { bg: string; bar: string; label: string }> = {
  p1: { bg: "#FBEEE7", bar: "#B54A1C", label: "Shah Kitchen Remodel" },
  p2: { bg: "#EAF0FD", bar: "#1E40AF", label: "Okafor Primary Bath" },
  p3: { bg: "#E7F4EC", bar: "#166534", label: "Whitaker Basement Finish" },
  p4: { bg: "#F0EFEB", bar: "#5E636E", label: "Sales & office" },
};
type Ev = { p: P; title: string; task: string; time: string; conflict?: boolean };
const DAYS = [
  ["Mon", "Nov 2"],
  ["Tue", "Nov 3"],
  ["Wed", "Nov 4"],
  ["Thu", "Nov 5"],
  ["Fri", "Nov 6"],
];
const e = (p: P, title: string, task: string, time: string, conflict?: boolean): Ev => ({ p, title, task, time, conflict });

const ROWS: { badge: string; name: string; sub: string; days: Ev[][] }[] = [
  { badge: "A", name: "Crew A", sub: "Tomás, Jordan", days: [[e("p1", "Shah Kitchen", "Under-cabinet wiring", "7:30–3:30")], [e("p1", "Shah Kitchen", "Layout & prep for cabinets", "7:30–4:00"), e("p2", "Okafor Bath", "Shower niche framing", "1:00–4:00 · conflict", true)], [e("p1", "Shah Kitchen", "Cabinet install · day 1", "7:00–4:00")], [e("p1", "Shah Kitchen", "Cabinet install · day 2", "7:00–4:00")], [e("p1", "Shah Kitchen", "Hardware & adjust", "7:30–12:00")]] },
  { badge: "B", name: "Crew B", sub: "Luis Ramos", days: [[e("p2", "Okafor Bath", "Waterproofing cure", "All day")], [e("p2", "Okafor Bath", "Shower pan inspection", "10:00–11:00")], [e("p2", "Okafor Bath", "Wall tile", "8:00–4:00")], [e("p2", "Okafor Bath", "Wall tile", "8:00–4:00")], [e("p2", "Okafor Bath", "Floor tile", "8:00–2:00")]] },
  { badge: "MB", name: "Marcus Bell", sub: "Project manager", days: [[e("p3", "Whitaker Basement", "Pre-construction walk", "9:00–10:00")], [], [e("p1", "Shah Kitchen", "Cabinet delivery", "7:00–9:00")], [], [e("p4", "Office", "Weekly job review", "3:00–4:00")]] },
  { badge: "LO", name: "Lena Ortiz", sub: "Estimator", days: [[], [e("p4", "Will Chen · lead", "ADU site visit", "2:00–3:30")], [], [e("p4", "Sofia Marquez · lead", "Finish selections", "10:00–11:30")], []] },
  { badge: "LS", name: "Lone Star Electric", sub: "Subcontractor", days: [[], [e("p2", "Okafor Bath", "Rough-in inspection", "8:00–9:00")], [], [], [e("p3", "Whitaker Basement", "Panel survey", "1:00–2:00")]] },
];

function EventChip({ ev, onClick }: { ev: Ev; onClick?: () => void }) {
  const c = PCOLOR[ev.p];
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      sx={{ display: "flex", flexDirection: "column", gap: "1px", width: "100%", p: "6px 8px", textAlign: "left", font: "inherit", fontSize: 12, cursor: "pointer", border: ev.conflict ? `1.5px dashed ${tokens.danger}` : 0, borderLeft: `3px solid ${ev.conflict ? tokens.danger : c.bar}`, borderRadius: "6px", bgcolor: ev.conflict ? tokens.dangerSoft : c.bg, color: tokens.ink, "& b": { fontWeight: 600, fontSize: 12.5 } }}
    >
      <b>{ev.title}</b>
      <span>{ev.task}</span>
      <Num sx={{ fontSize: 11, color: ev.conflict ? tokens.danger : "text.secondary" }}>{ev.time}</Num>
    </Box>
  );
}

const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

const schema = Yup.object({
  project: Yup.string().required("Choose a project."),
  task: Yup.string().trim().required("What's the work?"),
  assignee: Yup.string().required("Choose a crew or person."),
  date: Yup.string().required("Pick a date."),
  start: Yup.string().required("Start time is required."),
  end: Yup.string()
    .required("End time is required.")
    .test("after", "End must be after start.", function (end) {
      return !end || !this.parent.start || toMin(end) > toMin(this.parent.start);
    }),
});

export function ScheduleView() {
  const [range, setRange] = useState<"day" | "week" | "month">("week");
  const [assign, setAssign] = useState(false);
  const [conflict, setConflict] = useState(true);

  return (
    <>
      <Stack direction="row" flexWrap="wrap" justifyContent="space-between" alignItems="center" gap={2}>
        <Stack direction="row" alignItems="center" gap={1.5} flexWrap="wrap">
          <Typography variant="h1">Schedule</Typography>
          <Stack direction="row">
            <IconButton aria-label="Previous week">
              <ChevronLeftOutlined />
            </IconButton>
            <IconButton aria-label="Next week">
              <ChevronRightOutlined />
            </IconButton>
          </Stack>
          <Box sx={{ fontWeight: 500 }}>Nov 2 – 6, 2026</Box>
          <Button size="small">Today</Button>
        </Stack>
        <Stack direction="row" gap={1} flexWrap="wrap">
          <Segmented label="Range" value={range} onChange={setRange} options={[{ value: "day", label: "Day" }, { value: "week", label: "Week" }, { value: "month", label: "Month" }]} />
          <Button>Crews &amp; people</Button>
          <Button variant="contained" color="primary" startIcon={<AddOutlined />} onClick={() => setAssign(true)}>
            Assign work
          </Button>
        </Stack>
      </Stack>

      {conflict && (
        <Alert
          severity="error"
          action={
            <Button size="small" onClick={() => setConflict(false)}>
              Resolve
            </Button>
          }
        >
          <strong>Conflict:</strong> Crew A is booked on Shah and Okafor at the same time on Tue, Nov 3 (1:00–4:00 PM).
        </Alert>
      )}

      <Box sx={{ display: "grid", gap: 3, alignItems: "start", gridTemplateColumns: { xs: "1fr", xl: "minmax(0,1fr) 280px" } }}>
        <Card component="section" aria-label="Week calendar" sx={{ overflowX: "auto" }}>
          <Box sx={{ display: "grid", gridTemplateColumns: "180px repeat(5, minmax(150px,1fr))", minWidth: 940 }}>
            <Box sx={{ p: 1.5, borderBottom: `1px solid ${tokens.divider}`, bgcolor: tokens.surfaceMuted, fontSize: 12, color: "text.secondary" }}>Crew / person</Box>
            {DAYS.map(([d, date]) => (
              <Stack key={d} sx={{ p: 1.5, borderBottom: `1px solid ${tokens.divider}`, borderLeft: `1px solid ${tokens.divider}`, bgcolor: d === "Wed" ? tokens.brandSoft : tokens.surfaceMuted, fontSize: 12 }}>
                <Box sx={{ color: d === "Wed" ? tokens.brand : "text.secondary", fontWeight: d === "Wed" ? 600 : 400 }}>{d}</Box>
                <Box sx={{ fontWeight: 500, fontSize: 13.5 }}>{date}</Box>
              </Stack>
            ))}
            {ROWS.map((r) => [
              <Stack key={r.name} direction="row" gap={1} alignItems="center" sx={{ p: 1.5, borderBottom: `1px solid ${tokens.rowDivider}` }}>
                <Box sx={{ width: 28, height: 28, borderRadius: "50%", bgcolor: "#F0EFEB", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 600 }}>{r.badge}</Box>
                <Stack minWidth={0}>
                  <Box sx={{ fontWeight: 500, fontSize: 13.5 }}>{r.name}</Box>
                  <Muted sx={{ fontSize: 12 }}>{r.sub}</Muted>
                </Stack>
              </Stack>,
              ...r.days.map((evs, i) => (
                <Stack key={`${r.name}-${i}`} gap={0.75} sx={{ p: 0.75, minHeight: 84, borderBottom: `1px solid ${tokens.rowDivider}`, borderLeft: `1px solid ${tokens.rowDivider}` }}>
                  {evs.map((ev, j) => (
                    <EventChip key={j} ev={ev.conflict && !conflict ? { ...ev, conflict: false, time: "1:00–4:00" } : ev} />
                  ))}
                </Stack>
              )),
            ])}
          </Box>
        </Card>
        <Stack gap={3}>
          <SectionCard title="Unscheduled" action={<Num sx={{ color: "text.secondary", fontSize: 13 }}>3</Num>} bodySx={{ p: 1.5, display: "flex", flexDirection: "column", gap: 1 }}>
            <EventChip ev={e("p3", "Whitaker · Demo & prep", "2 days · Crew B suggested", "")} onClick={() => setAssign(true)} />
            <EventChip ev={e("p1", "Shah · Template countertops", "3 hrs · after cabinets", "")} onClick={() => setAssign(true)} />
            <EventChip ev={e("p2", "Okafor · Install shower glass", "4 hrs · glass ordered", "")} onClick={() => setAssign(true)} />
            <Muted sx={{ fontSize: 12.5 }}>Click to schedule on a crew row.</Muted>
          </SectionCard>
          <SectionCard title="Projects" bodySx={{ p: 2, display: "flex", flexDirection: "column", gap: 1 }}>
            {Object.values(PCOLOR).map((c) => (
              <Stack key={c.label} direction="row" gap={1} alignItems="center" sx={{ fontSize: 13.5 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: "3px", bgcolor: c.bar }} />
                {c.label}
              </Stack>
            ))}
          </SectionCard>
        </Stack>
      </Box>

      <Dialog open={assign} onClose={() => setAssign(false)} fullWidth maxWidth="sm">
        <Formik initialValues={{ project: "", task: "", assignee: "", date: "2026-11-04", start: "07:30", end: "15:30", notes: "" }} validationSchema={schema} onSubmit={() => setAssign(false)}>
          <Form noValidate>
            <DialogTitle>Assign work</DialogTitle>
            <DialogContent>
              <Stack gap={2}>
                <FormikSelect name="project" label="Project" options={Object.values(PCOLOR).map((c) => c.label)} />
                <FormikTextField name="task" label="Work" placeholder="e.g. Cabinet install · day 1" />
                <FormikSelect name="assignee" label="Crew or person" options={ROWS.map((r) => r.name)} />
                <FieldRow min={140}>
                  <FormikTextField name="date" label="Date" type="date" />
                  <FormikTextField name="start" label="Start" type="time" />
                  <FormikTextField name="end" label="End" type="time" />
                </FieldRow>
                <FormikTextField name="notes" label="Notes for the crew" multiline minRows={2} />
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setAssign(false)}>Cancel</Button>
              <Button type="submit" variant="contained" color="primary">
                Assign
              </Button>
            </DialogActions>
          </Form>
        </Formik>
      </Dialog>
    </>
  );
}
