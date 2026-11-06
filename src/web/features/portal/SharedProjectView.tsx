"use client";

import AttachMoneyOutlined from "@mui/icons-material/AttachMoneyOutlined";
import CalendarMonthOutlined from "@mui/icons-material/CalendarMonthOutlined";
import FolderOutlined from "@mui/icons-material/FolderOutlined";
import ForumOutlined from "@mui/icons-material/ForumOutlined";
import HomeOutlined from "@mui/icons-material/HomeOutlined";
import PlaceOutlined from "@mui/icons-material/PlaceOutlined";
import TaskAltOutlined from "@mui/icons-material/TaskAltOutlined";
import VisibilityOutlined from "@mui/icons-material/VisibilityOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Muted, StatusTag, TabBar } from "@web/components/ui";
import { ApiClientError, api } from "@web/lib/api-client";
import { PROJECT_STATUS_LABELS } from "@shared/contracts/projects";
import type { ProjectOverview } from "@shared/contracts/project-detail";
import type { SharedProject } from "@shared/contracts/project-share";
import { ProjectAccessContext, type ProjectAccess } from "@web/features/projects/detail/access";
import { sharedProjectApi } from "@web/features/projects/detail/api";
import { ActivityTab } from "@web/features/projects/detail/ActivityTab";
import { FilesTab } from "@web/features/projects/detail/FilesTab";
import { FinancesTab } from "@web/features/projects/detail/FinancesTab";
import { OverviewTab } from "@web/features/projects/detail/OverviewTab";
import { ScheduleTab } from "@web/features/projects/detail/ScheduleTab";
import { TasksTab } from "@web/features/projects/detail/TasksTab";
import { STATUS_TONE } from "@web/features/projects/ProjectsView";

const TABS = ["overview", "tasks", "schedule", "budget", "files", "activity"] as const;
type Tab = (typeof TABS)[number];
const TAB_ITEMS: { value: Tab; label: string; icon: React.ReactNode }[] = [
  { value: "overview", label: "Overview", icon: <HomeOutlined /> },
  { value: "tasks", label: "Tasks", icon: <TaskAltOutlined /> },
  { value: "schedule", label: "Schedule", icon: <CalendarMonthOutlined /> },
  { value: "budget", label: "Budget", icon: <AttachMoneyOutlined /> },
  { value: "files", label: "Files", icon: <FolderOutlined /> },
  { value: "activity", label: "Activity", icon: <ForumOutlined /> },
];

const NAME_KEY = "cos-share-name";
const readName = () => {
  try {
    return localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
};
const saveName = (n: string) => {
  try {
    localStorage.setItem(NAME_KEY, n);
  } catch {
    /* private mode: name lives for this visit only */
  }
};
const errText = (e: unknown) =>
  e instanceof ApiClientError
    ? e.status === 404
      ? "This link isn't active anymore. Ask the person who shared it for a new one."
      : e.body.message
    : "Something went wrong. Please try again.";

/**
 * Login-free project page from a share link: the same tabs as the staff page,
 * read-only, except tasks (add + update, no delete) when the link allows it.
 */
export function SharedProjectView({ token }: { token: string }) {
  const [info, setInfo] = useState<SharedProject | null>(null);
  const [overview, setOverview] = useState<ProjectOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [name, setName] = useState("");
  const [draftName, setDraftName] = useState("");

  useEffect(() => {
    const n = readName();
    setName(n);
    setDraftName(n);
  }, []);

  const papi = useMemo(() => sharedProjectApi(token, () => readName() || name), [token, name]);

  const load = useCallback(() => {
    Promise.all([api<SharedProject>(`/portal/projects/${token}`), papi.overview()])
      .then(([i, o]) => {
        setInfo(i);
        setOverview(o);
        setError(null);
        document.title = `${o.project.name} · ${i.company.name}`;
      })
      .catch((e) => setError(errText(e)));
  }, [token, papi]);
  useEffect(load, [load]);

  const access: ProjectAccess = useMemo(
    () => ({ edit: false, tasks: !!info?.allow_tasks && !!name, deleteTasks: false, shared: true }),
    [info?.allow_tasks, name],
  );

  if (!info || !overview)
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: "background.default", display: "grid", placeItems: "center", px: 2 }}>
        {error ? (
          <Card sx={{ p: 4, textAlign: "center", maxWidth: 440 }}>
            <Typography variant="h2" sx={{ mb: 1 }}>
              Link not available
            </Typography>
            <Muted>{error}</Muted>
          </Card>
        ) : (
          <CircularProgress />
        )}
      </Box>
    );

  const p = overview.project;
  const c = info.company;

  return (
    <ProjectAccessContext.Provider value={access}>
      <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
        <Box component="header" sx={{ bgcolor: "background.paper", borderBottom: 1, borderColor: "divider", px: { xs: 2, md: 4 }, py: 1.5 }}>
          <Stack direction="row" alignItems="center" gap={1.5} sx={{ maxWidth: 1280, mx: "auto" }}>
            {c.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element -- token-scoped API image
              <img src={c.logo_url} alt="" style={{ width: 32, height: 32, objectFit: "contain", borderRadius: 6 }} />
            )}
            <Stack sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontWeight: 600, fontSize: 15 }}>{c.name}</Typography>
              <Muted sx={{ fontSize: 12 }}>{[c.phone, c.email].filter(Boolean).join(" · ")}</Muted>
            </Stack>
            <Stack direction="row" gap={0.75} alignItems="center" sx={{ color: "text.secondary", fontSize: 12.5 }}>
              <VisibilityOutlined sx={{ fontSize: 16 }} />
              Shared with {info.label} · {info.allow_tasks ? "view + tasks" : "view only"}
            </Stack>
          </Stack>
        </Box>

        <Stack gap={3} sx={{ maxWidth: 1280, mx: "auto", px: { xs: 2, md: 4 }, py: 3 }}>
          <Stack gap={0.25}>
            <Stack direction="row" alignItems="center" gap={1.25} flexWrap="wrap">
              <Typography variant="h1">{p.name}</Typography>
              <StatusTag tone={STATUS_TONE[p.status]}>{PROJECT_STATUS_LABELS[p.status]}</StatusTag>
            </Stack>
            <Stack direction="row" alignItems="center" gap={0.5} sx={{ color: "text.secondary", fontSize: 13 }}>
              <PlaceOutlined sx={{ fontSize: 16 }} />
              {p.project_number} · {p.site.address_line1}
              {p.site.address_line2 ? `, ${p.site.address_line2}` : ""}, {p.site.city}, {p.site.state} {p.site.postal_code}
            </Stack>
          </Stack>

          {info.allow_tasks && !name && (
            <Alert
              severity="info"
              action={
                <Stack direction="row" gap={1} alignItems="center">
                  <TextField size="small" placeholder="Your name" value={draftName} onChange={(e) => setDraftName(e.target.value)} sx={{ bgcolor: "#fff", width: 180 }} />
                  <Button
                    variant="contained"
                    color="primary"
                    disabled={!draftName.trim()}
                    onClick={() => (saveName(draftName.trim()), setName(draftName.trim()))}
                  >
                    Continue
                  </Button>
                </Stack>
              }
            >
              Add your name to add or update tasks. It&apos;s shown next to your changes.
            </Alert>
          )}
          {info.allow_tasks && name && (
            <Muted sx={{ fontSize: 12.5, mt: -2 }}>
              Making changes as <b>{name}</b> ·{" "}
              <Box component="button" onClick={() => setName("")} sx={{ border: 0, bg: "none", background: "none", color: "primary.main", cursor: "pointer", p: 0, font: "inherit" }}>
                change
              </Box>
            </Muted>
          )}

          <TabBar label="Project sections" value={tab} onChange={setTab} items={TAB_ITEMS} />

          {tab === "overview" && <OverviewTab overview={overview} api={papi} goTo={(t) => setTab(t as Tab)} onChanged={load} />}
          {tab === "tasks" && <TasksTab api={papi} onChanged={load} />}
          {tab === "budget" && <FinancesTab project={p} api={papi} onChanged={load} />}
          {tab === "schedule" && <ScheduleTab api={papi} onChanged={load} />}
          {tab === "files" && <FilesTab api={papi} />}
          {tab === "activity" && <ActivityTab api={papi} />}

          <Muted sx={{ fontSize: 12, textAlign: "center", pt: 2 }}>
            Shared by {c.name} · Powered by ContractorOS{info.expires_at ? ` · link works until ${new Date(info.expires_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` : ""}
          </Muted>
        </Stack>
      </Box>
    </ProjectAccessContext.Provider>
  );
}
