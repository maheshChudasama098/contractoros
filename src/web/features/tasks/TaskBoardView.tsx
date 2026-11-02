"use client";

import AddOutlined from "@mui/icons-material/AddOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
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
import { InitialsAvatar, Muted, Num, StatusTag } from "@web/components/ui";
import { ProjectTabs } from "@web/features/projects/ProjectView";
import { Yup } from "@web/lib/validation";
import { tokens } from "@web/theme/tokens";

const COLUMNS = ["To do", "In progress", "Blocked", "Done"] as const;
type Column = (typeof COLUMNS)[number];
type Task = { id: number; title: string; note?: string; due: string; who: string; col: Column; high?: boolean; checklist?: string };

const INITIAL: Task[] = [
  { id: 1, title: "Template countertops", note: "After cabinets are set and leveled", due: "Nov 12", who: "Marcus Bell", col: "To do" },
  { id: 2, title: "Order pendant lights", due: "Nov 6", who: "Marcus Bell", col: "To do", checklist: "0/2" },
  { id: 3, title: "Final punch list walk", due: "Dec 16", who: "Marcus Bell", col: "To do" },
  { id: 4, title: "Confirm cabinet delivery window", due: "Due Oct 30", who: "Marcus Bell", col: "In progress", high: true },
  { id: 5, title: "Under-cabinet lighting wiring", note: "From approved CO-003", due: "Nov 2", who: "Tomás Reyes", col: "In progress", checklist: "1/3" },
  { id: 6, title: "Paint ceiling", due: "Oct 31", who: "Jordan Pike", col: "In progress" },
  { id: 7, title: "Set island base cabinets", note: "Waiting on CO-004 approval — gas line must be relocated first", due: "Nov 4", who: "Tomás Reyes", col: "Blocked" },
  { id: 8, title: "Patch & prime drywall", due: "Completed Oct 28", who: "Jordan Pike", col: "Done" },
  { id: 9, title: "Electrical rough-in inspection", due: "Completed Oct 9", who: "Tomás Reyes", col: "Done" },
  { id: 10, title: "Plumbing rough-in inspection", due: "Completed Oct 8", who: "Tomás Reyes", col: "Done" },
];

const ASSIGNEES = ["Marcus Bell", "Tomás Reyes", "Jordan Pike", "Luis Ramos"];

const schema = Yup.object({
  title: Yup.string().trim().required("Give the task a title.").max(140),
  col: Yup.string().oneOf([...COLUMNS]).required(),
  who: Yup.string().required("Assign someone."),
  due: Yup.string().required("Pick a due date."),
  note: Yup.string().when("col", { is: "Blocked", then: (s) => s.trim().required("Say what it's blocked on.") }),
});

export function TaskBoardView() {
  const [tasks, setTasks] = useState(INITIAL);
  const [edit, setEdit] = useState<Partial<Task> | null>(null);
  const blocked = tasks.filter((t) => t.col === "Blocked").length;

  return (
    <>
      <Stack direction="row" flexWrap="wrap" justifyContent="space-between" alignItems="flex-start" gap={2}>
        <Stack gap={0.5}>
          <Stack direction="row" gap={1.25} alignItems="center">
            <Typography variant="h1">Shah Kitchen Remodel</Typography>
            <StatusTag tone="success">Active</StatusTag>
          </Stack>
          <Muted>
            <Num>P-1042</Num> · {tasks.length} tasks · {blocked} blocked
          </Muted>
        </Stack>
        <Stack direction="row" gap={1}>
          <Button>Assignee: Everyone</Button>
          <Button variant="contained" color="primary" startIcon={<AddOutlined />} onClick={() => setEdit({ col: "To do" })}>
            Add task
          </Button>
        </Stack>
      </Stack>
      <ProjectTabs id="p-1042" current="Tasks" />
      <Box sx={{ display: "grid", gridAutoFlow: "column", gridAutoColumns: { xs: "minmax(270px, 85%)", md: "minmax(240px, 1fr)" }, gap: 1.5, overflowX: "auto", pb: 1 }}>
        {COLUMNS.map((col) => {
          const list = tasks.filter((t) => t.col === col);
          return (
            <Stack key={col} component="section" aria-label={col} gap={1} sx={{ bgcolor: col === "Blocked" ? "#FBEFEC" : "#EFEEEA", borderRadius: "12px", p: 1, minHeight: 240 }}>
              <Stack direction="row" alignItems="center" gap={1} sx={{ px: 0.75, minHeight: 32 }}>
                <Typography variant="h3" sx={{ fontSize: 13.5 }}>
                  {col}
                </Typography>
                <Num sx={{ fontSize: 12, color: "text.secondary" }}>{list.length}</Num>
                <IconButton size="small" aria-label={`Add task to ${col}`} sx={{ ml: "auto" }} onClick={() => setEdit({ col })}>
                  <AddOutlined fontSize="small" />
                </IconButton>
              </Stack>
              {list.map((t) => (
                <Box
                  key={t.id}
                  component="button"
                  type="button"
                  onClick={() => setEdit(t)}
                  sx={{ display: "flex", flexDirection: "column", gap: 0.75, p: 1.5, textAlign: "left", font: "inherit", cursor: "pointer", bgcolor: "#fff", border: `1px solid ${col === "Blocked" ? "#F4C7C0" : tokens.border}`, borderRadius: "10px", color: tokens.ink, "&:hover": { borderColor: "#C9C7BF" } }}
                >
                  <Box sx={{ fontWeight: 500, textDecoration: col === "Done" ? "line-through" : undefined, color: col === "Done" ? "text.secondary" : undefined }}>{t.title}</Box>
                  {t.note && <Box sx={{ fontSize: 12.5, color: col === "Blocked" ? tokens.danger : "text.secondary" }}>{t.note}</Box>}
                  <Stack direction="row" alignItems="center" gap={1} sx={{ fontSize: 12, color: "text.secondary" }}>
                    <span>{t.due}</span>
                    {t.checklist && <Num>{t.checklist}</Num>}
                    {t.high && <StatusTag tone="brand">High</StatusTag>}
                    <Box sx={{ ml: "auto" }} title={t.who}>
                      <InitialsAvatar name={t.who} size={22} />
                    </Box>
                  </Stack>
                </Box>
              ))}
            </Stack>
          );
        })}
      </Box>

      <Dialog open={!!edit} onClose={() => setEdit(null)} fullWidth maxWidth="sm">
        {edit && (
          <Formik
            initialValues={{ title: edit.title ?? "", col: edit.col ?? "To do", who: edit.who ?? "Marcus Bell", due: edit.due ?? "", note: edit.note ?? "" }}
            validationSchema={schema}
            onSubmit={(v) => {
              setTasks((ts) => (edit.id ? ts.map((t) => (t.id === edit.id ? { ...t, ...v, col: v.col as Column } : t)) : [...ts, { id: Date.now(), ...v, col: v.col as Column }]));
              setEdit(null);
            }}
          >
            <Form noValidate>
              <DialogTitle>{edit.id ? "Edit task" : "Add task"}</DialogTitle>
              <DialogContent>
                <Stack gap={2}>
                  <FormikTextField name="title" label="Title" autoFocus />
                  <FieldRow>
                    <FormikSelect name="col" label="Status" options={[...COLUMNS]} />
                    <FormikSelect name="who" label="Assignee" options={ASSIGNEES} />
                  </FieldRow>
                  <FormikTextField name="due" label="Due" placeholder="Nov 12" />
                  <FormikTextField name="note" label="Notes" multiline minRows={2} />
                </Stack>
              </DialogContent>
              <DialogActions>
                {edit.id && (
                  <Button sx={{ mr: "auto", color: tokens.danger }} variant="text" onClick={() => (setTasks((ts) => ts.filter((t) => t.id !== edit.id)), setEdit(null))}>
                    Delete
                  </Button>
                )}
                <Button onClick={() => setEdit(null)}>Cancel</Button>
                <Button type="submit" variant="contained" color="primary">
                  {edit.id ? "Save" : "Add task"}
                </Button>
              </DialogActions>
            </Form>
          </Formik>
        )}
      </Dialog>
    </>
  );
}
