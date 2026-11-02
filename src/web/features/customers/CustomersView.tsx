"use client";

import AddOutlined from "@mui/icons-material/AddOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import { Form, Formik } from "formik";
import { useMemo, useState } from "react";
import { FieldRow, FormikRadioGroup, FormikTextField } from "@web/components/form";
import { InitialsAvatar, Muted, Num, PageHeader, SearchField, StatusTag, TabBar, Toolbar, TwoLine, money } from "@web/components/ui";
import { customers } from "@web/mocks/data";
import { v, Yup } from "@web/lib/validation";
import { tokens } from "@web/theme/tokens";

type Seg = "active" | "balance" | "archived";

export function CustomersView() {
  const [seg, setSeg] = useState<Seg>("active");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return customers
      .filter((c) => (seg === "balance" ? c.balance > 0 : seg === "archived" ? c.status === "archived" : c.status === "active"))
      .filter((c) => !t || `${c.name} ${c.email} ${c.phone} ${c.property}`.toLowerCase().includes(t));
  }, [seg, q]);

  return (
    <>
      <PageHeader
        title="Customers"
        subtitle="8 customers · 9 properties · 5 with open projects"
        actions={
          <>
            <Button>Import CSV</Button>
            <Button variant="contained" color="primary" startIcon={<AddOutlined />} onClick={() => setOpen(true)}>
              New customer
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
            { value: "active", label: "Active", count: 8 },
            { value: "balance", label: "With open balance", count: 2 },
            { value: "archived", label: "Archived", count: 3 },
          ]}
        />
        <Toolbar>
          <SearchField label="Filter customers" placeholder="Name, email, phone or address" value={q} onChange={setQ} />
          <Button>Sort: Last activity</Button>
        </Toolbar>
      </Stack>
      <Card component="section" aria-label="Customers">
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Customer</TableCell>
                <TableCell>Primary contact</TableCell>
                <TableCell>Property</TableCell>
                <TableCell>Projects</TableCell>
                <TableCell align="right">Contracted</TableCell>
                <TableCell align="right">Balance</TableCell>
                <TableCell>Last activity</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((c) => (
                <TableRow key={c.id} hover>
                  <TableCell>
                    <Stack direction="row" alignItems="center" gap={1.25}>
                      <InitialsAvatar name={c.name} />
                      <TwoLine title={c.name} href={`/customers/${c.id}`} />
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <TwoLine title={<Box component="span" sx={{ fontWeight: 400 }}>{c.email}</Box>} sub={c.phone} />
                  </TableCell>
                  <TableCell sx={{ color: "text.secondary" }}>{c.property}</TableCell>
                  <TableCell>{c.projects ? <StatusTag tone={c.projects.tone}>{c.projects.label}</StatusTag> : <Muted>{c.projectsNote}</Muted>}</TableCell>
                  <TableCell align="right">{c.contracted ? <Num>{money(c.contracted, true)}</Num> : <Muted>—</Muted>}</TableCell>
                  <TableCell align="right">
                    <Num sx={{ color: c.balance ? tokens.ink : "text.secondary" }}>{money(c.balance, true)}</Num>
                  </TableCell>
                  <TableCell sx={{ color: "text.secondary" }}>{c.lastActivity}</TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6, color: "text.secondary" }}>
                    No customers match this view.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 2.5, py: 1.5, borderTop: `1px solid ${tokens.divider}` }}>
          <Muted sx={{ fontSize: 13 }}>
            Showing 1–{rows.length} of {rows.length}
          </Muted>
          <Stack direction="row" gap={1}>
            <Button size="small" disabled>
              Previous
            </Button>
            <Button size="small" disabled>
              Next
            </Button>
          </Stack>
        </Stack>
      </Card>
      <NewCustomerDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}

const customerSchema = Yup.object({
  type: Yup.string().oneOf(["household", "company"]),
  name: v.required("Customer name"),
  email: v.email(),
  phone: v.phone().required("Phone is required."),
  street: v.required("Street"),
  city: v.required("City"),
  state: v.required("State"),
  zip: v.zip().required("ZIP code is required."),
});

export function NewCustomerDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <Formik
        initialValues={{ type: "household", name: "", email: "", phone: "", street: "", city: "Austin", state: "TX", zip: "" }}
        validationSchema={customerSchema}
        onSubmit={onClose}
      >
        <Form noValidate>
          <DialogTitle>New customer</DialogTitle>
          <DialogContent>
            <Stack gap={2}>
              <FormikRadioGroup name="type" row options={[{ value: "household", label: "Household" }, { value: "company", label: "Company" }]} />
              <FormikTextField name="name" label="Customer name" placeholder="Priya & Morgan Shah" autoFocus />
              <FieldRow>
                <FormikTextField name="email" label="Email" type="email" />
                <FormikTextField name="phone" label="Phone" type="tel" />
              </FieldRow>
              <FormikTextField name="street" label="Property address" placeholder="Street" />
              <FieldRow min={120}>
                <FormikTextField name="city" label="City" />
                <FormikTextField name="state" label="State" />
                <FormikTextField name="zip" label="ZIP" inputMode="numeric" />
              </FieldRow>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="contained" color="primary">
              Create customer
            </Button>
          </DialogActions>
        </Form>
      </Formik>
    </Dialog>
  );
}
