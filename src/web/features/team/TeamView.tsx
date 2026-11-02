"use client";

import MoreHorizOutlined from "@mui/icons-material/MoreHorizOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Checkbox from "@mui/material/Checkbox";
import FormHelperText from "@mui/material/FormHelperText";
import FormLabel from "@mui/material/FormLabel";
import IconButton from "@mui/material/IconButton";
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
import { useMemo, useState } from "react";
import { RemoveMemberDialog } from "@web/components/dialogs";
import { FormikCheckbox, FormikTextField } from "@web/components/form";
import { InitialsAvatar, Muted, PageHeader, SearchField, SectionCard, StatusTag, TwoLine } from "@web/components/ui";
import { v, Yup } from "@web/lib/validation";
import { tokens } from "@web/theme/tokens";

type Member = { name: string; email: string; roles: string[]; status: "Active" | "Invited"; last: string; owner?: boolean };
const INITIAL: Member[] = [
  { name: "Dana Ruiz", email: "dana@harborpine.com", roles: ["Owner"], status: "Active", last: "Now", owner: true },
  { name: "Marcus Bell", email: "marcus@harborpine.com", roles: ["Project Manager"], status: "Active", last: "12 min ago" },
  { name: "Lena Ortiz", email: "lena@harborpine.com", roles: ["Estimator", "Sales"], status: "Active", last: "1 hr ago" },
  { name: "Sam Whitfield", email: "sam@harborpine.com", roles: ["Sales"], status: "Active", last: "Yesterday" },
  { name: "Kira Nguyen", email: "kira@harborpine.com", roles: ["Accountant"], status: "Active", last: "Yesterday" },
  { name: "Tomás Reyes", email: "Crew A lead", roles: ["Field Worker"], status: "Active", last: "Today" },
  { name: "Jordan Pike", email: "Crew A", roles: ["Field Worker"], status: "Active", last: "Today" },
  { name: "Luis Ramos", email: "Crew B lead", roles: ["Field Worker"], status: "Active", last: "Today" },
  { name: "alex.moreno@harborpine.com", email: "Invited by Dana · expires Nov 5", roles: ["Estimator"], status: "Invited", last: "" },
];

const ROLES: [string, string][] = [
  ["Sales", "Leads, customers, estimates. No internal cost."],
  ["Estimator", "Estimates, catalog, proposals."],
  ["Project Manager", "Projects, schedule, change orders."],
  ["Field Worker", "Assigned tasks and uploads only."],
];

const MATRIX: [string, ...string[]][] = [
  ["Leads, customers & properties", "✓", "✓", "✓", "✓", "View", "—", "View"],
  ["Create & issue estimates", "✓", "✓", "✓", "✓", "—", "—", "—"],
  ["View internal cost & margin", "✓", "✓", "If granted", "If granted", "—", "—", "If granted"],
  ["Projects, tasks & schedule", "✓", "✓", "—", "—", "✓", "Assigned", "—"],
  ["Issue & void change orders", "✓", "✓", "—", "—", "✓", "—", "—"],
  ["Issue & void invoices, refunds", "✓", "✓", "—", "—", "—", "—", "✓"],
  ["Integrations & QuickBooks", "✓", "✓", "—", "—", "—", "—", "✓"],
  ["Team, billing & ownership", "✓", "Team only", "—", "—", "—", "—", "—"],
];

const Role = ({ children }: { children: string }) => (
  <Box component="span" sx={{ display: "inline-flex", alignItems: "center", height: 24, px: 1, borderRadius: "6px", border: `1px solid ${tokens.border}`, fontSize: 12.5, fontWeight: 500, bgcolor: "#fff" }}>
    {children}
  </Box>
);

const inviteSchema = Yup.object({
  email: v.email().matches(/@harborpine\.com$/i, { message: "Use a harborpine.com address — or ask an Owner to allow outside domains.", excludeEmptyString: true }),
  roles: Yup.array().of(Yup.string()).min(1, "Choose at least one role."),
});

export function TeamView() {
  const [members, setMembers] = useState(INITIAL);
  const [q, setQ] = useState("");
  const [menu, setMenu] = useState<{ el: HTMLElement; m: Member } | null>(null);
  const [remove, setRemove] = useState<Member | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const rows = useMemo(() => members.filter((m) => `${m.name} ${m.email}`.toLowerCase().includes(q.trim().toLowerCase())), [members, q]);

  return (
    <>
      <PageHeader title="Team & roles" subtitle="8 active members · 1 pending invite · 15 seats on Growth" />
      <Box sx={{ display: "grid", gap: 3, alignItems: "start", gridTemplateColumns: { xs: "1fr", lg: "minmax(0,1fr) 360px" } }}>
        <SectionCard title="Members" action={<SearchField label="Filter members" placeholder="Filter members" value={q} onChange={setQ} />}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Roles</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Last active</TableCell>
                  <TableCell>
                    <Box component="span" sx={{ position: "absolute", width: "1px", height: "1px", overflow: "hidden", clip: "rect(0 0 0 0)" }}>
                      Actions
                    </Box>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((m) => (
                  <TableRow key={m.name} hover>
                    <TableCell>
                      <Stack direction="row" gap={1.25} alignItems="center">
                        <InitialsAvatar name={m.status === "Invited" ? "Alex Moreno" : m.name} size={30} />
                        <TwoLine title={m.name} sub={m.email} />
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" gap={0.5} flexWrap="wrap">
                        {m.roles.map((r) => (
                          <Role key={r}>{r}</Role>
                        ))}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <StatusTag tone={m.status === "Active" ? "success" : "warning"}>{m.status}</StatusTag>
                    </TableCell>
                    <TableCell sx={{ color: "text.secondary" }}>
                      {m.status === "Invited" ? (
                        <Stack direction="row" gap={0.5}>
                          <Button size="small" variant="text" onClick={() => setToast("Invite resent")}>
                            Resend
                          </Button>
                          <Button size="small" variant="text" onClick={() => setMembers((ms) => ms.filter((x) => x !== m))}>
                            Revoke
                          </Button>
                        </Stack>
                      ) : (
                        m.last
                      )}
                    </TableCell>
                    <TableCell align="right">
                      {!m.owner && m.status === "Active" && (
                        <IconButton size="small" aria-label={`Actions for ${m.name}`} onClick={(e) => setMenu({ el: e.currentTarget, m })}>
                          <MoreHorizOutlined fontSize="small" />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </SectionCard>

        <Card component="section">
          <Box sx={{ px: 2.5, py: 1.75, borderBottom: `1px solid ${tokens.divider}` }}>
            <Typography variant="h3">Invite a teammate</Typography>
          </Box>
          <Formik
            initialValues={{ email: "", roles: ["Estimator"] as string[], costAccess: true }}
            validationSchema={inviteSchema}
            onSubmit={(vals, { resetForm }) => {
              setMembers((ms) => [...ms, { name: vals.email, email: "Invited by Dana · expires in 7 days", roles: vals.roles, status: "Invited", last: "" }]);
              setToast(`Invite sent to ${vals.email}`);
              resetForm();
            }}
          >
            {({ values, setFieldValue, errors, touched, isSubmitting }) => (
              <Form noValidate>
                <Stack gap={2} sx={{ p: 2.5 }}>
                  <FormikTextField name="email" label="Email" type="email" placeholder="name@harborpine.com" />
                  <Box component="fieldset" sx={{ border: 0, p: 0, m: 0 }}>
                    <FormLabel component="legend" sx={{ mb: 1 }}>
                      Roles
                    </FormLabel>
                    <Stack gap={0.5}>
                      {ROLES.map(([r, hint]) => {
                        const on = values.roles.includes(r);
                        return (
                          <Box key={r} component="label" sx={{ display: "flex", gap: 1, alignItems: "flex-start", p: 1, borderRadius: "8px", cursor: "pointer", bgcolor: on ? tokens.surfaceMuted : undefined }}>
                            <Checkbox checked={on} onChange={() => setFieldValue("roles", on ? values.roles.filter((x) => x !== r) : [...values.roles, r])} sx={{ p: 0.25 }} />
                            <Stack>
                              <Box sx={{ fontWeight: 500, fontSize: 14 }}>{r}</Box>
                              <Muted sx={{ fontSize: 12.5 }}>{hint}</Muted>
                            </Stack>
                          </Box>
                        );
                      })}
                    </Stack>
                    {touched.roles && typeof errors.roles === "string" && <FormHelperText error>{errors.roles}</FormHelperText>}
                  </Box>
                  <FormikCheckbox name="costAccess" label="Can view internal cost & margin" />
                  <Button type="submit" variant="contained" color="primary" disabled={isSubmitting}>
                    Send invite
                  </Button>
                  <Muted sx={{ fontSize: 12 }}>Invites expire after 7 days. Members can belong to more than one company.</Muted>
                </Stack>
              </Form>
            )}
          </Formik>
        </Card>
      </Box>

      <SectionCard
        title={
          <Stack>
            <Typography variant="h3">Role permissions</Typography>
            <Muted sx={{ fontSize: 12.5 }}>Defaults for each system role. Enforced on the server for every request.</Muted>
          </Stack>
        }
        action={<Button size="small">Customize roles</Button>}
      >
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                {["Permission", "Owner", "Admin", "Sales", "Estimator", "Project Mgr", "Field", "Accountant"].map((h, i) => (
                  <TableCell key={h} align={i ? "center" : "left"}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {MATRIX.map(([perm, ...cells]) => (
                <TableRow key={perm}>
                  <TableCell sx={{ fontWeight: 500 }}>{perm}</TableCell>
                  {cells.map((c, i) => (
                    <TableCell key={i} align="center" sx={{ color: c === "✓" ? "#166534" : c === "—" ? "#B4B8C0" : "#8A4B08", fontWeight: c === "✓" ? 600 : 400, fontSize: c.length > 1 ? 12.5 : 14 }}>
                      {c}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </SectionCard>

      <Menu anchorEl={menu?.el} open={!!menu} onClose={() => setMenu(null)}>
        <MenuItem onClick={() => (setMenu(null), setToast("Role editor coming from API"))}>Change roles</MenuItem>
        <MenuItem onClick={() => (setRemove(menu!.m), setMenu(null))} sx={{ color: tokens.danger }}>
          Remove from team…
        </MenuItem>
      </Menu>
      <RemoveMemberDialog
        open={!!remove}
        name={remove?.name}
        onClose={() => setRemove(null)}
        onConfirm={() => {
          setMembers((ms) => ms.filter((m) => m !== remove));
          setToast(`${remove?.name} removed`);
        }}
      />
      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)} message={toast} />
    </>
  );
}
