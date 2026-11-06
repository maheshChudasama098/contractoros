"use client";

import ArrowBackOutlined from "@mui/icons-material/ArrowBackOutlined";
import AttachMoneyOutlined from "@mui/icons-material/AttachMoneyOutlined";
import CalendarMonthOutlined from "@mui/icons-material/CalendarMonthOutlined";
import CheckOutlined from "@mui/icons-material/CheckOutlined";
import IosShareOutlined from "@mui/icons-material/IosShareOutlined";
import EditOutlined from "@mui/icons-material/EditOutlined";
import FolderOutlined from "@mui/icons-material/FolderOutlined";
import ForumOutlined from "@mui/icons-material/ForumOutlined";
import HomeOutlined from "@mui/icons-material/HomeOutlined";
import KeyboardArrowDownOutlined from "@mui/icons-material/KeyboardArrowDownOutlined";
import MoreVertOutlined from "@mui/icons-material/MoreVertOutlined";
import PlaceOutlined from "@mui/icons-material/PlaceOutlined";
import TaskAltOutlined from "@mui/icons-material/TaskAltOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ConfirmDialog } from "@web/components/dialogs";
import { useBreadcrumbLabel } from "@web/components/layout/breadcrumb-label";
import { StatusTag, TabBar } from "@web/components/ui";
import { tokens } from "@web/theme/tokens";
import { PROJECT_STATUS_LABELS, PROJECT_STATUSES, type ProjectDto, type ProjectInput, type ProjectStatus } from "@shared/contracts/projects";
import type { ProjectOverview } from "@shared/contracts/project-detail";
import { applyApiError } from "@web/features/customers/api";
import { projectsApi } from "../api";
import { ProjectDialog, STATUS_TONE } from "../ProjectsView";
import { ActivityTab } from "./ActivityTab";
import { projectDetailApi } from "./api";
import { FilesTab } from "./FilesTab";
import { FinancesTab } from "./FinancesTab";
import { ShareDrawer } from "./ShareDrawer";
import { OverviewTab } from "./OverviewTab";
import { ScheduleTab } from "./ScheduleTab";
import { TasksTab } from "./TasksTab";

export const TABS = ["overview", "tasks", "schedule", "budget", "files", "activity"] as const;
export type Tab = (typeof TABS)[number];

const TAB_ITEMS: { value: Tab; label: string; icon: React.ReactNode }[] = [
  { value: "overview", label: "Overview", icon: <HomeOutlined /> },
  { value: "tasks", label: "Tasks", icon: <TaskAltOutlined /> },
  { value: "schedule", label: "Schedule", icon: <CalendarMonthOutlined /> },
  { value: "budget", label: "Budget", icon: <AttachMoneyOutlined /> },
  { value: "files", label: "Files", icon: <FolderOutlined /> },
  { value: "activity", label: "Activity", icon: <ForumOutlined /> },
];

const toInput = (p: ProjectDto, status: ProjectStatus): ProjectInput => ({
  name: p.name,
  customer_id: p.customer.id,
  status,
  priority: p.priority,
  planned_start_date: p.planned_start_date,
  planned_end_date: p.planned_end_date,
  contract_value: p.contract_value,
  site_address_line1: p.site.address_line1,
  site_address_line2: p.site.address_line2,
  site_city: p.site.city,
  site_state: p.site.state,
  site_postal_code: p.site.postal_code,
});

export function ProjectDetailView({ projectId }: { projectId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const raw = params.get("tab") === "finances" ? "budget" : params.get("tab"); // old links
  const tab: Tab = (TABS as readonly string[]).includes(raw ?? "") ? (raw as Tab) : "overview";
  const api = useMemo(() => projectDetailApi(projectId), [projectId]);

  const [overview, setOverview] = useState<ProjectOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [menu, setMenu] = useState<HTMLElement | null>(null);
  const [statusMenu, setStatusMenu] = useState<HTMLElement | null>(null);
  const [sharing, setSharing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(() => {
    api
      .overview()
      .then((o) => (setOverview(o), setError(null)))
      .catch((e: Error) => setError(e.message));
  }, [api]);
  useEffect(load, [load]);

  const project = overview?.project;
  useBreadcrumbLabel(project ? `${project.project_number} · ${project.name}` : null);

  const goTo = useCallback(
    (t: Tab) => router.replace(t === "overview" ? pathname : `${pathname}?tab=${t}`, { scroll: false }),
    [router, pathname],
  );

  const setStatus = async (status: ProjectStatus) => {
    if (!project) return;
    try {
      await projectsApi.update(project.id, toInput(project, status));
      setToast(`Marked ${PROJECT_STATUS_LABELS[status].toLowerCase()}`);
      load();
    } catch (e) {
      setToast(applyApiError(e, () => {}) ?? "Could not update project");
    }
  };

  if (error && !project) return <Alert severity="error">{error}</Alert>;
  if (!project || !overview)
    return (
      <Box sx={{ display: "grid", placeItems: "center", py: 10 }}>
        <CircularProgress />
      </Box>
    );

  return (
    <>
      {/* Header */}
      <Stack direction="row" alignItems="center" gap={1.5} flexWrap="wrap">
        <IconButton component={Link} href="/projects" aria-label="Back to projects" sx={{ ml: -1 }}>
          <ArrowBackOutlined />
        </IconButton>
        <Stack sx={{ flex: 1, minWidth: 0 }} gap={0.25}>
          <Stack direction="row" alignItems="center" gap={1.25} flexWrap="wrap">
            <Typography variant="h1" noWrap>
              {project.name}
            </Typography>
          </Stack>
          <Stack direction="row" alignItems="center" gap={0.5} sx={{ color: "text.secondary", fontSize: 13 }}>
            <PlaceOutlined sx={{ fontSize: 16 }} />
            <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {project.project_number} · {project.site.address_line1}
              {project.site.address_line2 ? `, ${project.site.address_line2}` : ""}, {project.site.city}, {project.site.state}{" "}
              {project.site.postal_code}
            </Box>
          </Stack>
        </Stack>
        <Stack direction="row" gap={1} alignItems="center">
          <Button
            variant="contained"
            color="primary"
            endIcon={<KeyboardArrowDownOutlined />}
            onClick={(e) => setStatusMenu(e.currentTarget)}
            aria-haspopup="menu"
            aria-label={`Status: ${PROJECT_STATUS_LABELS[project.status]}. Change status`}
          >
            {PROJECT_STATUS_LABELS[project.status]}
          </Button>
          <Button startIcon={<IosShareOutlined />} onClick={() => setSharing(true)}>
            Share
          </Button>
          <Button startIcon={<EditOutlined />} onClick={() => setEditing(true)}>
            Edit
          </Button>
          <IconButton aria-label="More project actions" onClick={(e) => setMenu(e.currentTarget)}>
            <MoreVertOutlined />
          </IconButton>
        </Stack>
      </Stack>

      <TabBar label="Project sections" value={tab} onChange={goTo} items={TAB_ITEMS} />
      {sharing && <ShareDrawer projectId={project.id} projectName={project.name} onClose={() => setSharing(false)} />}

      {tab === "overview" && <OverviewTab overview={overview} api={api} goTo={goTo} onChanged={load} />}
      {tab === "tasks" && <TasksTab api={api} onChanged={load} />}
      {tab === "budget" && <FinancesTab project={project} api={api} onChanged={load} />}
      {tab === "schedule" && <ScheduleTab api={api} onChanged={load} />}
      {tab === "files" && <FilesTab api={api} />}
      {tab === "activity" && <ActivityTab api={api} />}

      <Menu
        anchorEl={statusMenu}
        open={!!statusMenu}
        onClose={() => setStatusMenu(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        {PROJECT_STATUSES.map((st) => (
          <MenuItem
            key={st}
            selected={st === project.status}
            onClick={() => (setStatusMenu(null), st !== project.status && setStatus(st))}
            sx={{ gap: 1.5, minWidth: 200 }}
          >
            <StatusTag tone={STATUS_TONE[st]}>{PROJECT_STATUS_LABELS[st]}</StatusTag>
            {st === project.status && <CheckOutlined sx={{ fontSize: 17, ml: "auto", color: tokens.brand }} />}
          </MenuItem>
        ))}
      </Menu>

      <Menu anchorEl={menu} open={!!menu} onClose={() => setMenu(null)}>
        <MenuItem onClick={() => (setDeleting(true), setMenu(null))} sx={{ color: tokens.danger }}>
          Delete…
        </MenuItem>
      </Menu>

      {editing && (
        <ProjectDialog
          project={project}
          onClose={() => setEditing(false)}
          onSaved={(msg) => (setEditing(false), setToast(msg), load())}
        />
      )}

      <ConfirmDialog
        open={deleting}
        onClose={() => setDeleting(false)}
        destructive
        title={`Delete ${project.name}?`}
        description="This permanently removes the project. Projects with tasks, expenses or invoices can only be cancelled."
        confirmLabel="Delete project"
        onConfirm={async () => {
          try {
            await projectsApi.remove(project.id);
            router.replace("/projects");
          } catch (e) {
            setToast(applyApiError(e, () => {}) ?? "Could not delete project");
          }
        }}
      />
      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)} message={toast} />
    </>
  );
}
