"use client";

import CloseOutlined from "@mui/icons-material/CloseOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Form, Formik } from "formik";
import { FieldRow, FormikSelect, FormikTextField } from "@web/components/form";
import { LEAD_SOURCES, TEAM } from "@web/mocks/data";
import { v, Yup } from "@web/lib/validation";
import { tokens } from "@web/theme/tokens";
import { leadsApi } from "../api";

const initialValues = {
  first_name: "",
  last_name: "",
  phone: "",
  email: "",
  address: "",
  source: "Referral",
  estimated_value: "",
  owner: "Sam Whitfield",
  next_follow_up_at: "",
  notes: "",
};
type Values = typeof initialValues;

// Spec: only a name and one contact method are required.
const schema = Yup.object({
  first_name: Yup.string().trim().max(100).required("First name is required."),
  last_name: Yup.string().trim().max(100),
  phone: v.phone().test("contact", "Add a phone or an email.", function (phone) {
    return !!phone || !!this.parent.email;
  }),
  email: Yup.string().trim().email("Enter a valid email address."),
  estimated_value: Yup.string().matches(/^\d{1,10}(\.\d{1,2})?$/, "Use an amount like 25000 or 1250.50."),
  next_follow_up_at: Yup.string(),
  notes: Yup.string().max(10_000),
});

export function NewLeadDrawer({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated?: (name: string) => void }) {
  const submit = async (values: Values, { setStatus }: { setStatus: (s: string) => void }) => {
    try {
      await leadsApi.create({
        first_name: values.first_name || undefined,
        last_name: values.last_name || undefined,
        email: values.email || undefined,
        phone: values.phone || undefined,
        estimated_value: values.estimated_value || undefined,
        next_follow_up_at: values.next_follow_up_at ? new Date(values.next_follow_up_at).toISOString() : undefined,
        notes: values.notes || undefined,
      });
      onCreated?.(`${values.first_name} ${values.last_name}`.trim());
      onClose();
    } catch (e) {
      setStatus((e as Error).message || "Couldn't create the lead. Try again.");
    }
  };

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: "100%", sm: 460 } } }}>
      <Formik initialValues={initialValues} validationSchema={schema} onSubmit={submit}>
        {({ isSubmitting, status }) => (
          <Form noValidate style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <Stack direction="row" alignItems="flex-start" gap={2} sx={{ px: 3, py: 2.5, borderBottom: `1px solid ${tokens.divider}` }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h2" sx={{ fontSize: 18 }}>
                  New lead
                </Typography>
                <Typography sx={{ color: "text.secondary", fontSize: 13 }}>Only a name and one contact method are required.</Typography>
              </Box>
              <IconButton aria-label="Close" onClick={onClose}>
                <CloseOutlined />
              </IconButton>
            </Stack>
            <Stack gap={2} sx={{ p: 3, flex: 1, overflowY: "auto" }}>
              {status && <Alert severity="error">{status}</Alert>}
              <FieldRow>
                <FormikTextField name="first_name" label="First name" placeholder="Hannah" autoFocus />
                <FormikTextField name="last_name" label="Last name" placeholder="Lowe" />
              </FieldRow>
              <FormikTextField name="phone" label="Phone" type="tel" placeholder="(512) 555-0147" />
              <FormikTextField name="email" label="Email" type="email" placeholder="name@email.com" />
              <FormikTextField name="address" label="Project address" placeholder="Street, city" />
              <FieldRow>
                <FormikSelect name="source" label="Source" options={LEAD_SOURCES} />
                <FormikTextField name="estimated_value" label="Estimated value" placeholder="0" inputMode="decimal" slotProps={{ input: { startAdornment: <Box sx={{ color: "text.secondary", pl: 1.5 }}>$</Box> } }} />
              </FieldRow>
              <FieldRow>
                <FormikSelect name="owner" label="Owner" options={TEAM} />
                <FormikTextField name="next_follow_up_at" label="Next follow-up" type="datetime-local" />
              </FieldRow>
              <FormikTextField name="notes" label="Notes" multiline minRows={4} placeholder="What they're looking for, timing, budget…" />
            </Stack>
            <Stack direction="row" justifyContent="flex-end" gap={1} sx={{ px: 3, py: 2, borderTop: `1px solid ${tokens.divider}`, bgcolor: tokens.surfaceMuted }}>
              <Button variant="text" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" variant="contained" color="primary" disabled={isSubmitting}>
                {isSubmitting ? "Creating…" : "Create lead"}
              </Button>
            </Stack>
          </Form>
        )}
      </Formik>
    </Drawer>
  );
}
