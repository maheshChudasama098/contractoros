"use client";

import AddOutlined from "@mui/icons-material/AddOutlined";
import MoreHorizOutlined from "@mui/icons-material/MoreHorizOutlined";
import TaskAltOutlined from "@mui/icons-material/TaskAltOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import { Form, Formik } from "formik";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ConfirmDialog } from "@web/components/dialogs";
import { FieldRow, FormikSelect, FormikTextField } from "@web/components/form";
import { EmptyState, Muted, SectionCard, Segmented, StatusTag } from "@web/components/ui";
import { Yup } from "@web/lib/validation";
import { tokens } from "@web/theme/tokens";
import { TASK_STATUS_LABELS, TASK_STATUSES, type AssigneeOption, type TaskDto, type TaskInput } from "@shared/contracts/project-detail";
import { applyApiError } from "@web/features/customers/api";
import { fmtDay, todayYmd, type ProjectDetailApi } from "./api";
import { TASK_TONE } from "./OverviewTab";

type Filter = "open" | "done" | "all";
const PRIORITY_LABEL = { low: "Low", normal: "Normal", high: "High", urgent: "Urgent" } as const;

const toInput = (t: TaskDto, patch: Partial<TaskInput> = {}): TaskInput => ({
  title: t.title,
  description: t.description,
  status: t.status,
  priority: t.priority,
  assignee_membership_id: t.assignee?.id ?? null,
  due_date: t.due_date,
  ...patch,
});

export function TasksTab({ api, onChanged }: { api: ProjectDetailApi; onChanged: () => void }) {
  const [tasks, setTasks] = useState<TaskDto[] | null>(null);
  const [assignees, setAssignees] = useState<AssigneeOption[]>([]);
  const [filter, setFilter] = useState<Filter>("open");
  const [error, setError] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ el: HTMLElement; t: TaskDto } | null>(null);
  const [editing, setEditing] = useState<TaskDto | "new" | null>(null);
  const [deleting, setDeleting] = useState<TaskDto | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(() => {
    Promise.all([api.tasks(), api.assignees()])
      .then(([t, a]) => (setTasks(t), setAssignees(a), setError(null)))
      .catch((e: Error) => setError(e.message));
  }, [api]);
  useEffect(load, [load]);

  const refresh = () => (load(), onChanged());

  const rows = useMemo(
    () =>
      (tasks ?? []).filter((t) =>
        filter === "all" ? true : filter === "done" ? t.status === "done" || t.status === "cancelled" : t.status !== "done" && t.status !== "cancelled",
      ),
    [tasks, filter],
  );
  const openCount = tasks?.filter((t) => t.status !== "done" && t.status !== "cancelled").length ?? 0;
  const today = todayYmd();

  const toggleDone = async (t: TaskDto) => {
    try {
      await api.updateTask(t.id, toInput(t, { status: t.status === "done" ? "todo" : "done" }));
      refresh();
    } catch (e) {
      setToast(applyApiError(e, () => {}) ?? "Could not update task");
    }
  };

  return (
    <>
      {error && <Alert severity="error">{error}</Alert>}
      <SectionCard
        title="Tasks"
        action={
          <Stack direction="row" gap={1.5} alignItems="center">
            <Segmented
              label="Filter tasks"
              value={filter}
              onChange={setFilter}
              options={[
                { value: "open", label: `Open${tasks ? ` (${openCount})` : ""}` },
                { value: "done", label: "Done" },
                { value: "all", label: "All" },
              ]}
            />
            <Button variant="contained" color="primary" startIcon={<AddOutlined />} onClick={() => setEditing("new")}>
              Add task
            </Button>
          </Stack>
        }
      >
        {tasks && rows.length === 0 ? (
          <EmptyState
            icon={<TaskAltOutlined />}
            title={filter === "open" ? (tasks.length ? "No open tasks. Nice." : "No tasks yet") : "Nothing here"}
            body={tasks.length ? undefined : "Break the job into tasks and assign them to your team."}
          />
        ) : (
          <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
            {rows.map((t) => {
              const done = t.status === "done";
              const overdue = !done && t.due_date && t.due_date < today;
              return (
                <Stack
                  component="li"
                  key={t.id}
                  direction="row"
                  alignItems="center"
                  gap={1.25}
                  sx={{ px: 1.5, py: 1, borderBottom: `1px solid ${tokens.rowDivider}`, "&:hover": { bgcolor: tokens.surfaceMuted } }}
                >
                  <Checkbox checked={done} onChange={() => toggleDone(t)} inputProps={{ "aria-label": `Mark ${t.title} ${done ? "not done" : "done"}` }} />
                  <Stack sx={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => setEditing(t)}>
                    <Box sx={{ fontWeight: 500, textDecoration: done ? "line-through" : "none", color: done ? "text.secondary" : tokens.ink }}>{t.title}</Box>
                    <Muted sx={{ fontSize: 12.5 }}>
                      {t.assignee?.name ?? "Unassigned"}
                      {t.due_date && (
                        <Box component="span" sx={{ color: overdue ? tokens.danger : undefined, fontWeight: overdue ? 500 : 400 }}>
                          {" · "}
                          {overdue ? "Overdue · " : "Due "}
                          {fmtDay(t.due_date, { month: "short", day: "numeric" })}
                        </Box>
                      )}
                    </Muted>
                  </Stack>
                  {(t.priority === "high" || t.priority === "urgent") && (
                    <StatusTag tone="danger" dot={false}>
                      {PRIORITY_LABEL[t.priority]}
                    </StatusTag>
                  )}
                  <StatusTag tone={TASK_TONE[t.status]}>{TASK_STATUS_LABELS[t.status]}</StatusTag>
                  <IconButton size="small" aria-label={`Actions for ${t.title}`} onClick={(e) => setMenu({ el: e.currentTarget, t })}>
                    <MoreHorizOutlined fontSize="small" />
                  </IconButton>
                </Stack>
              );
            })}
          </Box>
        )}
      </SectionCard>

      <Menu anchorEl={menu?.el} open={!!menu} onClose={() => setMenu(null)}>
        <MenuItem onClick={() => (setEditing(menu!.t), setMenu(null))}>Edit task</MenuItem>
        <MenuItem onClick={() => (setDeleting(menu!.t), setMenu(null))} sx={{ color: tokens.danger }}>
          Delete…
        </MenuItem>
      </Menu>

      {editing && (
        <TaskDialog
          api={api}
          task={editing === "new" ? null : editing}
          assignees={assignees}
          onClose={() => setEditing(null)}
          onSaved={(msg) => (setEditing(null), setToast(msg), refresh())}
        />
      )}
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        destructive
        title={`Delete "${deleting?.title}"?`}
        confirmLabel="Delete task"
        onConfirm={async () => {
          try {
            await api.deleteTask(deleting!.id);
            setToast("Task deleted");
            refresh();
          } catch (e) {
            setToast(applyApiError(e, () => {}) ?? "Could not delete task");
          }
        }}
      />
      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)} message={toast} />
    </>
  );
}

type TaskForm = { title: string; description: string; status: string; priority: string; assignee_membership_id: string; due_date: string };

function TaskDialog({
  api,
  task,
  assignees,
  onClose,
  onSaved,
}: {
  api: ProjectDetailApi;
  task: TaskDto | null;
  assignees: AssigneeOption[];
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const isNew = !task;
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <Formik<TaskForm>
        initialValues={{
          title: task?.title ?? "",
          description: task?.description ?? "",
          status: task?.status ?? "todo",
          priority: task?.priority ?? "normal",
          assignee_membership_id: task?.assignee?.id ?? "",
          due_date: task?.due_date ?? "",
        }}
        validationSchema={Yup.object({ title: Yup.string().trim().required("Task title is required.").max(180) })}
        onSubmit={async (vals, { setStatus, setFieldError }) => {
          setStatus(null);
          const input = vals as TaskInput;
          try {
            const saved = isNew ? await api.createTask(input) : await api.updateTask(task.id, input);
            onSaved(isNew ? `Task "${saved.title}" added` : "Task updated");
          } catch (e) {
            setStatus(applyApiError(e, setFieldError));
          }
        }}
      >
        {({ isSubmitting, status }) => (
          <Form noValidate>
            <DialogTitle>{isNew ? "Add task" : "Edit task"}</DialogTitle>
            <DialogContent>
              <Stack gap={2}>
                {status && <Alert severity="error">{status}</Alert>}
                <FormikTextField name="title" label="Title" placeholder="Order cabinets" autoFocus />
                <FieldRow>
                  <FormikSelect
                    name="assignee_membership_id"
                    label="Assignee"
                    options={[{ value: "", label: "Unassigned" }, ...assignees.map((a) => ({ value: a.id, label: a.name }))]}
                    SelectProps={{ displayEmpty: true }}
                  />
                  <FormikTextField name="due_date" label="Due date" type="date" />
                </FieldRow>
                <FieldRow>
                  <FormikSelect name="status" label="Status" options={TASK_STATUSES.map((s) => ({ value: s, label: TASK_STATUS_LABELS[s] }))} />
                  <FormikSelect name="priority" label="Priority" options={Object.entries(PRIORITY_LABEL).map(([value, label]) => ({ value, label }))} />
                </FieldRow>
                <FormikTextField name="description" label="Details" multiline minRows={3} placeholder="Optional" />
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={onClose}>Cancel</Button>
              <Button type="submit" variant="contained" color="primary" disabled={isSubmitting}>
                {isNew ? "Add task" : "Save changes"}
              </Button>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </Dialog>
  );
}
