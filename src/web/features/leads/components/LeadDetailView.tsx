"use client";

import CallOutlined from "@mui/icons-material/CallOutlined";
import CheckOutlined from "@mui/icons-material/CheckOutlined";
import EmailOutlined from "@mui/icons-material/EmailOutlined";
import EventOutlined from "@mui/icons-material/EventOutlined";
import FlagOutlined from "@mui/icons-material/FlagOutlined";
import NoteAltOutlined from "@mui/icons-material/NoteAltOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Form, Formik } from "formik";
import { useState } from "react";
import { FormikSelect, FormikTextField } from "@web/components/form";
import { DetailList, IconTile, InitialsAvatar, Muted, Num, SectionCard, Segmented, SplitLayout, StatusTag } from "@web/components/ui";
import { leads } from "@web/mocks/data";
import { Yup } from "@web/lib/validation";
import { tokens } from "@web/theme/tokens";

const STEPS = ["New", "Contacted", "Qualified", "Estimate", "Won / Lost"];

type Activity = { icon: React.ReactNode; title: string; meta: React.ReactNode; body?: string };

const INITIAL_ACTIVITY: Activity[] = [
  { icon: <FlagOutlined />, title: "Follow-up: book site visit", meta: <StatusTag tone="danger">Due today 2:30 PM</StatusTag>, body: "Assigned to Lena Ortiz" },
  { icon: <CallOutlined />, title: "Call · 14 min", meta: "Oct 27, 4:10 PM · Lena Ortiz", body: "Wants a walk-in shower in place of the tub, new vanity and tile floor. Hoping to finish before family visits in late January. Budget around $25–30k." },
  { icon: <EmailOutlined />, title: "Email sent · “Thanks for reaching out”", meta: "Oct 26, 9:02 AM · Lena Ortiz" },
  { icon: <NoteAltOutlined />, title: "Lead created · stage New", meta: "Oct 25, 7:48 PM · Sam Whitfield" },
];

const KIND_ICON = { note: <NoteAltOutlined />, call: <CallOutlined />, email: <EmailOutlined />, meeting: <EventOutlined /> };
type Kind = keyof typeof KIND_ICON;

export function LeadDetailView({ id }: { id: string }) {
  const lead = leads.find((l) => l.id === id) ?? leads.find((l) => l.id === "amara-diallo")!;
  const [kind, setKind] = useState<Kind>("note");
  const [activity, setActivity] = useState(INITIAL_ACTIVITY);
  const [lostOpen, setLostOpen] = useState(false);
  const current = Math.max(0, STEPS.findIndex((s) => s === lead.stage));

  return (
    <>
      <Stack direction="row" flexWrap="wrap" alignItems="flex-start" justifyContent="space-between" gap={2}>
        <Stack direction="row" gap={2} alignItems="center" minWidth={0}>
          <InitialsAvatar name={lead.name} size={52} />
          <Stack gap={0.5}>
            <Stack direction="row" alignItems="center" gap={1.5} flexWrap="wrap">
              <Typography variant="h1">{lead.name}</Typography>
              <StatusTag tone="info">{lead.stage}</StatusTag>
            </Stack>
            <Muted>
              {lead.project} remodel · <Num>{`$${lead.value.toLocaleString()}`}</Num> estimated · Source: {lead.source} · Owner: {lead.owner}
            </Muted>
          </Stack>
        </Stack>
        <Stack direction="row" gap={1} flexWrap="wrap">
          <Button startIcon={<CallOutlined />} href="tel:+15125550182">
            Call
          </Button>
          <Button onClick={() => setLostOpen(true)}>Mark as lost</Button>
          <Button variant="contained" color="primary">
            Convert to customer
          </Button>
        </Stack>
      </Stack>

      <Card component="section" aria-label="Stage" sx={{ display: "grid", gridTemplateColumns: `repeat(${STEPS.length}, minmax(0,1fr))`, overflowX: "auto" }}>
        {STEPS.map((s, i) => {
          const done = i < current;
          const on = i === current;
          return (
            <Stack
              key={s}
              direction="row"
              alignItems="center"
              gap={1}
              sx={{ px: 2, py: 1.75, minWidth: 130, borderRight: i < STEPS.length - 1 ? `1px solid ${tokens.divider}` : 0, bgcolor: on ? tokens.brandSoft : undefined, fontWeight: 500, color: i > current ? "text.secondary" : tokens.ink }}
            >
              <Box sx={{ width: 20, height: 20, borderRadius: "50%", display: "grid", placeItems: "center", fontSize: 11, bgcolor: done ? tokens.ink : on ? tokens.brand : "transparent", color: "#fff", border: i > current ? "1.5px solid #C9C7BF" : 0 }}>
                {done ? <CheckOutlined sx={{ fontSize: 13 }} /> : on ? i + 1 : ""}
              </Box>
              {s}
            </Stack>
          );
        })}
      </Card>

      <SplitLayout
        main={
          <>
            <Card component="section" aria-label="Log activity">
              <Box sx={{ px: 1.5, pt: 1.5 }}>
                <Segmented
                  label="Activity type"
                  value={kind}
                  onChange={setKind}
                  options={[
                    { value: "note", label: "Note" },
                    { value: "call", label: "Call" },
                    { value: "email", label: "Email" },
                    { value: "meeting", label: "Meeting" },
                  ]}
                />
              </Box>
              <Formik
                initialValues={{ body: "" }}
                validationSchema={Yup.object({ body: Yup.string().trim().required("Write something before saving.").max(5000) })}
                onSubmit={(vals, { resetForm }) => {
                  setActivity((a) => [{ icon: KIND_ICON[kind], title: `${kind[0]!.toUpperCase()}${kind.slice(1)} logged`, meta: "Just now · Dana Ruiz", body: vals.body }, ...a]);
                  resetForm();
                }}
              >
                <Form noValidate>
                  <Stack gap={1.5} sx={{ p: 1.5 }}>
                    <FormikTextField name="body" aria-label={kind} multiline minRows={3} placeholder="Add an internal note — never shown to the customer" />
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Muted sx={{ fontSize: 12.5 }}>Internal only</Muted>
                      <Button type="submit">Save {kind}</Button>
                    </Stack>
                  </Stack>
                </Form>
              </Formik>
            </Card>

            <SectionCard title="Activity" action={<Muted sx={{ fontSize: 13 }}>{activity.length} entries</Muted>} bodySx={{ px: 2.5, py: 1 }}>
              {activity.map((a, i) => (
                <Stack key={i} direction="row" gap={1.5} sx={{ py: 1.5, borderBottom: i < activity.length - 1 ? `1px solid ${tokens.rowDivider}` : 0 }}>
                  <IconTile size={28}>{a.icon}</IconTile>
                  <Stack gap={0.5} flex={1} minWidth={0}>
                    <Stack direction="row" flexWrap="wrap" justifyContent="space-between" gap={1}>
                      <Box sx={{ fontWeight: 500 }}>{a.title}</Box>
                      {typeof a.meta === "string" ? <Muted sx={{ fontSize: 12.5 }}>{a.meta}</Muted> : a.meta}
                    </Stack>
                    {a.body && <Typography sx={{ fontSize: 13.5, color: tokens.ink2 }}>{a.body}</Typography>}
                  </Stack>
                </Stack>
              ))}
            </SectionCard>
          </>
        }
        side={
          <>
            <SectionCard title="Details" action={<Button variant="text" size="small">Edit</Button>}>
              <DetailList
                items={[
                  { k: "Phone", v: <a href="tel:+15125550182">(512) 555-0182</a> },
                  { k: "Email", v: <a href="mailto:amara.diallo@gmail.com">amara.diallo@gmail.com</a> },
                  { k: "Address", v: "1907 Brushy Creek Rd, Cedar Park, TX 78613" },
                  { k: "Source", v: lead.source },
                  { k: "Owner", v: <Stack direction="row" gap={1} alignItems="center"><InitialsAvatar name={lead.owner} size={22} />{lead.owner}</Stack> },
                  { k: "Created", v: "Oct 25, 2026" },
                ]}
              />
            </SectionCard>
            <Card sx={{ p: 2.5, display: "flex", flexDirection: "column", gap: 1.5 }}>
              <Typography variant="h3">When you convert</Typography>
              <Muted sx={{ fontSize: 13.5 }}>Creates a customer and the property at 1907 Brushy Creek Rd using the details above, then opens a new estimate. Converting twice never creates duplicates.</Muted>
              <Button variant="contained" color="primary">
                Convert to customer
              </Button>
            </Card>
          </>
        }
      />

      <Dialog open={lostOpen} onClose={() => setLostOpen(false)} fullWidth maxWidth="xs">
        <Formik
          initialValues={{ reason: "", detail: "" }}
          validationSchema={Yup.object({
            reason: Yup.string().required("Pick a reason."),
            detail: Yup.string().when("reason", { is: "Other", then: (s) => s.trim().required("Tell us what happened.") }),
          })}
          onSubmit={() => setLostOpen(false)}
        >
          <Form noValidate>
            <DialogTitle>Mark {lead.name} as lost?</DialogTitle>
            <DialogContent>
              <Stack gap={2}>
                <Muted sx={{ fontSize: 13.5 }}>The lead moves to Lost and open follow-ups are cancelled. You can reopen it later.</Muted>
                <FormikSelect name="reason" label="Reason" options={["Chose lower bid", "Budget", "Timing", "No response", "Other"]} />
                <FormikTextField name="detail" label="Details" multiline minRows={2} />
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setLostOpen(false)}>Cancel</Button>
              <Button type="submit" variant="contained" color="error">
                Mark as lost
              </Button>
            </DialogActions>
          </Form>
        </Formik>
      </Dialog>
    </>
  );
}
