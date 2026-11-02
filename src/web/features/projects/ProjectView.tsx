"use client";

import CheckOutlined from "@mui/icons-material/CheckOutlined";
import ContentCopyOutlined from "@mui/icons-material/ContentCopyOutlined";
import ImageOutlined from "@mui/icons-material/ImageOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { Form, Formik } from "formik";
import Link from "next/link";
import { useState } from "react";
import { RevokePortalDialog } from "@web/components/dialogs";
import { FormikRadioGroup, FormikTextField } from "@web/components/form";
import { DetailList, InitialsAvatar, Muted, Num, SectionCard, SplitLayout, StatusTag } from "@web/components/ui";
import { projects, type ProjectStatus } from "@web/mocks/data";
import { Yup } from "@web/lib/validation";
import { tokens } from "@web/theme/tokens";
import { STATUS_TONE } from "./ProjectsView";

export function ProjectTabs({ id, current }: { id: string; current: string }) {
  const tabs = [
    ["Overview", `/projects/${id}`],
    ["Tasks", "/tasks", 14],
    ["Schedule", "/schedule"],
    ["Change orders", "/change-orders", 5],
    ["Invoices", "/invoices", 2],
    ["Files", "/files", 23],
  ] as const;
  return (
    <Box component="nav" aria-label="Project sections" sx={{ display: "flex", gap: 2.5, borderBottom: `1px solid ${tokens.border}`, overflowX: "auto" }}>
      {tabs.map(([label, href, count]) => (
        <Box
          key={label}
          component={Link}
          href={href}
          aria-current={label === current ? "page" : undefined}
          sx={{ display: "inline-flex", alignItems: "center", gap: 0.75, height: 44, whiteSpace: "nowrap", fontSize: 13.5, fontWeight: 500, mb: "-1px", borderBottom: `2px solid ${label === current ? tokens.brand : "transparent"}`, color: label === current ? tokens.ink : "text.secondary", "&:hover": { color: tokens.ink } }}
        >
          {label}
          {count != null && <Num sx={{ fontSize: 12, color: "text.secondary" }}>{count}</Num>}
        </Box>
      ))}
    </Box>
  );
}

const FIN = [
  ["Base contract", "$86,400.00"],
  ["Approved changes", "+$3,250.00"],
  ["Contract value", "$89,650.00", "strong"],
  ["Pending change", "+$1,840.00", "warn"],
  ["Invoiced", "$55,090.00"],
  ["Paid", "$40,920.00"],
  ["Balance due", "$14,170.00", "brand"],
];

const MILESTONES: [string, string, "done" | "now" | "todo", string?][] = [
  ["Demolition complete", "Completed Sep 18", "done"],
  ["Rough-in inspections passed", "Completed Oct 9", "done"],
  ["Cabinets installed", "Delivery confirmed Wed · Crew A", "now", "Nov 4"],
  ["Countertops templated & installed", "Nov 20", "todo"],
  ["Backsplash, lighting & fixtures", "Dec 4", "todo"],
  ["Final walkthrough", "Dec 18", "todo"],
];

type Update = { who: string; when: string; visible: boolean; body: string; photos?: string[] };

export function ProjectView({ id }: { id: string }) {
  const p = projects.find((x) => x.no.toLowerCase() === id) ?? projects[0]!;
  const [status, setStatus] = useState<ProjectStatus>(p.status);
  const [statusEl, setStatusEl] = useState<HTMLElement | null>(null);
  const [postOpen, setPostOpen] = useState(false);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [updates, setUpdates] = useState<Update[]>([
    { who: "Marcus Bell", when: "Oct 28, 5:10 PM", visible: true, body: "Drywall is patched and primed after the rough-in. Cabinet delivery is confirmed for Wednesday morning — please keep the driveway clear from 7–9 AM.", photos: ["Primed walls", "Ceiling lights", "Cabinet layout"] },
    { who: "Tomás Reyes", when: "Oct 27, 3:42 PM", visible: false, body: "Found the range gas line routed through the new island footprint. Needs relocation before cabinets — Marcus drafted CO-004." },
  ]);

  return (
    <>
      <Stack direction="row" flexWrap="wrap" justifyContent="space-between" alignItems="flex-start" gap={2}>
        <Stack gap={0.5}>
          <Stack direction="row" gap={1.25} alignItems="center" flexWrap="wrap">
            <Typography variant="h1">{p.name}</Typography>
            <StatusTag tone={STATUS_TONE[status]}>{status}</StatusTag>
            {p.priority === "High" && <StatusTag tone="brand">High priority</StatusTag>}
          </Stack>
          <Muted>
            <Num>{p.no}</Num> · <Link href="/customers/shah">Priya &amp; Morgan Shah</Link> · {p.address} · Sep 14 – Dec 18, 2026
          </Muted>
        </Stack>
        <Stack direction="row" gap={1} flexWrap="wrap">
          <Button onClick={(e) => setStatusEl(e.currentTarget)}>Change status</Button>
          <Menu anchorEl={statusEl} open={!!statusEl} onClose={() => setStatusEl(null)}>
            {(Object.keys(STATUS_TONE) as ProjectStatus[]).map((s) => (
              <MenuItem key={s} selected={s === status} onClick={() => (setStatus(s), setStatusEl(null))}>
                {s}
              </MenuItem>
            ))}
          </Menu>
          <Button component={Link} href="/change-orders?new=1">
            New change order
          </Button>
          <Button variant="contained" color="primary" onClick={() => setPostOpen(true)}>
            Post update
          </Button>
        </Stack>
      </Stack>

      <ProjectTabs id={id} current="Overview" />

      <Card component="section" aria-label="Project financials" sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(150px,100%),1fr))" }}>
        {FIN.map(([k, val, kind], i) => (
          <Stack key={k} gap={0.5} sx={{ px: 2.25, py: 2, borderRight: i < FIN.length - 1 ? `1px solid ${tokens.divider}` : 0, bgcolor: kind === "strong" ? tokens.surfaceMuted : undefined }}>
            <Muted sx={{ fontSize: 12 }}>{k}</Muted>
            <Num sx={{ fontSize: 17, fontWeight: 500, color: kind === "brand" ? tokens.brand : kind === "warn" ? "#8A4B08" : tokens.ink }}>{val}</Num>
          </Stack>
        ))}
      </Card>

      <SplitLayout
        main={
          <>
            <SectionCard title="Milestones" action={<Muted sx={{ fontSize: 13 }}>58% complete</Muted>} bodySx={{ px: 2.5, py: 1 }}>
              {MILESTONES.map(([t, sub, s, date], i) => (
                <Stack key={t} direction="row" gap={1.5} sx={{ py: 1.25, borderBottom: i < MILESTONES.length - 1 ? `1px solid ${tokens.rowDivider}` : 0 }}>
                  <Box sx={{ width: 20, height: 20, mt: "2px", borderRadius: "50%", flex: "none", display: "grid", placeItems: "center", bgcolor: s === "done" ? "#166534" : s === "now" ? tokens.brand : "#fff", border: s === "todo" ? "1.5px solid #C9C7BF" : 0, color: "#fff" }}>
                    {s === "done" && <CheckOutlined sx={{ fontSize: 13 }} />}
                  </Box>
                  <Stack direction="row" flex={1} justifyContent="space-between" gap={1} flexWrap="wrap">
                    <Stack>
                      <Box sx={{ fontWeight: 500, color: s === "todo" ? tokens.ink2 : tokens.ink }}>{t}</Box>
                      {s !== "todo" && <Muted sx={{ fontSize: 13 }}>{sub}</Muted>}
                    </Stack>
                    {s === "now" ? (
                      <Stack direction="row" gap={1} alignItems="center">
                        <StatusTag tone="brand">In progress</StatusTag>
                        <Muted sx={{ fontSize: 13 }}>{date}</Muted>
                      </Stack>
                    ) : (
                      s === "todo" && <Muted sx={{ fontSize: 13 }}>{sub}</Muted>
                    )}
                  </Stack>
                </Stack>
              ))}
            </SectionCard>

            <SectionCard title="Progress updates" action={<Link href="/portal/demo">Preview as customer</Link>}>
              {updates.map((u, i) => (
                <Stack key={i} component="article" gap={1.25} sx={{ p: 2.5, borderBottom: i < updates.length - 1 ? `1px solid ${tokens.rowDivider}` : 0 }}>
                  <Stack direction="row" gap={1.25} alignItems="center">
                    <InitialsAvatar name={u.who} size={30} />
                    <Stack flex={1}>
                      <Box sx={{ fontWeight: 500 }}>{u.who}</Box>
                      <Muted sx={{ fontSize: 12.5 }}>{u.when}</Muted>
                    </Stack>
                    <StatusTag tone={u.visible ? "success" : "neutral"} dot={false}>
                      {u.visible ? "Visible to customer" : "Internal"}
                    </StatusTag>
                  </Stack>
                  <Typography sx={{ fontSize: 14 }}>{u.body}</Typography>
                  {u.photos && (
                    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px,1fr))", gap: 1 }}>
                      {u.photos.map((ph) => (
                        <Stack key={ph} alignItems="center" justifyContent="center" gap={0.5} sx={{ height: 100, borderRadius: "8px", bgcolor: "#E9E7E1", color: "text.secondary", fontSize: 12 }}>
                          <ImageOutlined fontSize="small" />
                          {ph}
                        </Stack>
                      ))}
                    </Box>
                  )}
                </Stack>
              ))}
            </SectionCard>

            <SectionCard title="Payment schedule" action={<Link href="/invoices">All invoices</Link>}>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Milestone</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Invoice</TableCell>
                      <TableCell align="right">Amount</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>Deposit · 30%</TableCell>
                      <TableCell><StatusTag tone="success">Paid</StatusTag></TableCell>
                      <TableCell><Num>INV-3104</Num></TableCell>
                      <TableCell align="right"><Num>$25,920.00</Num></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Rough-in complete · 30% + CO-001, CO-003</TableCell>
                      <TableCell><StatusTag tone="brand">Partially paid</StatusTag></TableCell>
                      <TableCell><Link href="/invoices/inv-3108"><Num>INV-3108</Num></Link></TableCell>
                      <TableCell align="right"><Num>$29,170.00</Num></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Cabinets installed · 25%</TableCell>
                      <TableCell><StatusTag>Planned</StatusTag></TableCell>
                      <TableCell><Button size="small" variant="text" component={Link} href="/invoices/new">Create invoice</Button></TableCell>
                      <TableCell align="right"><Num>$21,600.00</Num></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Final · 15%</TableCell>
                      <TableCell><StatusTag>Planned</StatusTag></TableCell>
                      <TableCell><Muted>—</Muted></TableCell>
                      <TableCell align="right"><Num>$12,960.00</Num></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </SectionCard>
          </>
        }
        side={
          <>
            <SectionCard title="Customer portal" action={<StatusTag tone="success">Link active</StatusTag>}>
              <Stack direction="row" alignItems="center" gap={1} sx={{ mx: 2.5, mt: 2, px: 1.5, py: 1, borderRadius: "8px", bgcolor: tokens.surfaceMuted, border: `1px solid ${tokens.border}` }}>
                <Num sx={{ flex: 1, fontSize: 12.5, color: "text.secondary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>contractoros.app/p/••••••••••••Xq7</Num>
                <Button size="small" variant="text" startIcon={<ContentCopyOutlined sx={{ fontSize: "14px !important" }} />} onClick={() => setToast("Portal link copied")}>
                  Copy
                </Button>
              </Stack>
              <DetailList
                items={[
                  { k: "Sent to", v: "priya.shah@gmail.com" },
                  { k: "Last viewed", v: "Oct 27, 9:14 PM" },
                  { k: "Expires", v: "Never · read-only" },
                  { k: "Approvals", v: "Email code required" },
                ]}
              />
              <Stack direction="row" gap={1} sx={{ px: 2.5, pb: 2.5 }}>
                <Button size="small" onClick={() => setToast("New portal link created")}>
                  Create new link
                </Button>
                <Button size="small" onClick={() => setRevokeOpen(true)}>
                  Revoke link
                </Button>
              </Stack>
            </SectionCard>
            <SectionCard title="Team" action={<Link href="/team">Manage</Link>} bodySx={{ px: 2.5, py: 1 }}>
              {([
                ["Marcus Bell", "Project manager"],
                ["Lena Ortiz", "Estimator"],
                ["Tomás Reyes", "Crew A lead"],
                ["Jordan Pike", "Field"],
              ] as const).map(([n, r]) => (
                <Stack key={n} direction="row" gap={1.25} alignItems="center" sx={{ py: 1 }}>
                  <InitialsAvatar name={n} size={28} />
                  <Box sx={{ flex: 1, fontWeight: 500 }}>{n}</Box>
                  <Muted sx={{ fontSize: 13 }}>{r}</Muted>
                </Stack>
              ))}
            </SectionCard>
            <SectionCard title="Linked records" bodySx={{ px: 2.5, py: 1 }}>
              {[
                [<>Contract <Num>CT-0161</Num></>, <StatusTag key="a" tone="success">Signed Sep 4</StatusTag>],
                [<>Estimate <Num>EST-2052 v3</Num></>, <StatusTag key="b" tone="success">Accepted</StatusTag>],
                ["QuickBooks customer", <StatusTag key="c" tone="danger">Sync failed</StatusTag>],
              ].map(([k, v], i) => (
                <Stack key={i} direction="row" justifyContent="space-between" alignItems="center" sx={{ py: 1.1, fontSize: 13.5 }}>
                  <span>{k}</span>
                  {v}
                </Stack>
              ))}
            </SectionCard>
          </>
        }
      />

      <Dialog open={postOpen} onClose={() => setPostOpen(false)} fullWidth maxWidth="sm">
        <Formik
          initialValues={{ body: "", visibility: "customer" }}
          validationSchema={Yup.object({ body: Yup.string().trim().min(10, "Write at least a sentence (10+ characters).").required("Write an update."), visibility: Yup.string().required() })}
          onSubmit={(v) => {
            setUpdates((u) => [{ who: "Dana Ruiz", when: "Just now", visible: v.visibility === "customer", body: v.body }, ...u]);
            setPostOpen(false);
            setToast(v.visibility === "customer" ? "Update posted and shared with the customer" : "Internal update posted");
          }}
        >
          <Form noValidate>
            <DialogTitle>Post a progress update</DialogTitle>
            <DialogContent>
              <Stack gap={2}>
                <FormikTextField name="body" label="Update" multiline minRows={4} placeholder="What got done, what's next, anything the homeowner needs to know…" autoFocus />
                <FormikRadioGroup
                  name="visibility"
                  label="Who can see this"
                  options={[
                    { value: "customer", label: "Customer & team (shown in portal)" },
                    { value: "internal", label: "Internal only" },
                  ]}
                />
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setPostOpen(false)}>Cancel</Button>
              <Button type="submit" variant="contained" color="primary">
                Post update
              </Button>
            </DialogActions>
          </Form>
        </Formik>
      </Dialog>
      <RevokePortalDialog open={revokeOpen} onClose={() => setRevokeOpen(false)} onConfirm={() => setToast("Portal link revoked")} />
      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)} message={toast} />
    </>
  );
}
