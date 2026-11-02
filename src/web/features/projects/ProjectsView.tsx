"use client";

import AddOutlined from "@mui/icons-material/AddOutlined";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Link from "next/link";
import { useMemo, useState } from "react";
import { InitialsAvatar, Muted, Num, PageHeader, Progress, SearchField, StatusTag, TabBar, TwoLine } from "@web/components/ui";
import { projects, type ProjectStatus } from "@web/mocks/data";
import { tokens, type Tone } from "@web/theme/tokens";

export const STATUS_TONE: Record<ProjectStatus, Tone> = { Active: "success", Scheduled: "info", "On hold": "warning", Planned: "neutral", Completed: "neutral" };
const PRI_COLOR = { High: tokens.brand, Normal: tokens.ink2, Low: "#8A8F99" };

type Seg = "open" | ProjectStatus | "closed";

export function ProjectsView() {
  const [seg, setSeg] = useState<Seg>("open");
  const [q, setQ] = useState("");
  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return projects
      .filter((p) => (seg === "open" ? p.status !== "Completed" : seg === "closed" ? p.status === "Completed" : p.status === seg))
      .filter((p) => !t || `${p.name} ${p.address} ${p.no}`.toLowerCase().includes(t));
  }, [seg, q]);

  return (
    <>
      <PageHeader
        title="Projects"
        subtitle={
          <>
            <Num>$263,300</Num> in open contract value across 5 projects
          </>
        }
        actions={
          <>
            <Button component={Link} href="/schedule">
              Open schedule
            </Button>
            <Button variant="contained" color="primary" startIcon={<AddOutlined />}>
              New project
            </Button>
          </>
        }
      />
      <Stack direction="row" flexWrap="wrap" justifyContent="space-between" alignItems="flex-end" gap={2}>
        <TabBar
          label="Status"
          value={seg}
          onChange={setSeg}
          items={[
            { value: "open", label: "Open", count: 5 },
            { value: "Active", label: "Active", count: 2 },
            { value: "Scheduled", label: "Scheduled", count: 1 },
            { value: "Planned", label: "Planned", count: 1 },
            { value: "On hold", label: "On hold", count: 1 },
            { value: "closed", label: "Closed", count: 1 },
          ]}
        />
        <SearchField label="Filter projects" placeholder="Project, customer, address…" value={q} onChange={setQ} />
      </Stack>
      <Card component="section" aria-label="Projects">
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Project</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Manager</TableCell>
                <TableCell>Schedule</TableCell>
                <TableCell sx={{ minWidth: 150 }}>Progress</TableCell>
                <TableCell align="right">Contract value</TableCell>
                <TableCell align="right">Balance due</TableCell>
                <TableCell>Portal</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((p) => (
                <TableRow key={p.no} hover>
                  <TableCell>
                    <TwoLine
                      title={p.name}
                      href={`/projects/${p.no.toLowerCase()}`}
                      sub={
                        <>
                          <Num>{p.no}</Num> · {p.address}
                        </>
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <StatusTag tone={STATUS_TONE[p.status]}>{p.status}</StatusTag>
                  </TableCell>
                  <TableCell sx={{ color: p.priority ? PRI_COLOR[p.priority] : "text.secondary", fontWeight: p.priority === "High" ? 500 : 400 }}>{p.priority ?? "—"}</TableCell>
                  <TableCell>
                    <Stack direction="row" gap={1} alignItems="center">
                      <InitialsAvatar name={p.manager} size={24} />
                      {p.manager.split(" ")[0]}
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ color: "text.secondary", whiteSpace: "nowrap" }}>{p.schedule}</TableCell>
                  <TableCell>{p.progress == null ? <Muted>Not started</Muted> : <Progress value={p.progress} color={p.status === "On hold" ? "#C79A3E" : undefined} />}</TableCell>
                  <TableCell align="right">
                    <Num>{p.contract}</Num>
                  </TableCell>
                  <TableCell align="right">
                    <Num sx={{ color: p.balance === "$0.00" ? "text.secondary" : tokens.ink }}>{p.balance}</Num>
                  </TableCell>
                  <TableCell>
                    <StatusTag tone={p.portal === "Shared" ? "success" : "neutral"}>{p.portal}</StatusTag>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </>
  );
}
