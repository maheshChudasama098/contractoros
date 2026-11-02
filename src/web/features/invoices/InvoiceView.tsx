"use client";

import MoreHorizOutlined from "@mui/icons-material/MoreHorizOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import LinearProgress from "@mui/material/LinearProgress";
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
import Link from "next/link";
import { useState } from "react";
import { ConfirmDialog, RefundDialog } from "@web/components/dialogs";
import { FormikTextField } from "@web/components/form";
import { KeyValue, Muted, Num, SectionCard, SplitLayout, StatusTag, TwoLine } from "@web/components/ui";
import { Yup } from "@web/lib/validation";
import { tokens } from "@web/theme/tokens";

const HISTORY = [
  ["Reminder scheduled", "Nov 4 · 2 days before due"],
  ["Partial payment · $15,000.00", "Oct 27 · confirmed by Stripe"],
  ["Payment attempt failed", "Oct 25 · card declined"],
  ["Viewed by customer", "Oct 24 · in portal"],
  ["Issued & emailed", "Oct 23 · by Kira Nguyen"],
];

export function InvoiceView({ id }: { id: string }) {
  const no = id.toUpperCase();
  const [more, setMore] = useState<HTMLElement | null>(null);
  const [refund, setRefund] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  return (
    <>
      <Stack direction="row" flexWrap="wrap" justifyContent="space-between" alignItems="flex-start" gap={2}>
        <Stack gap={0.5}>
          <Stack direction="row" gap={1.25} alignItems="center">
            <Typography variant="h1" className="num">
              {no}
            </Typography>
            <StatusTag tone="brand">Partially paid</StatusTag>
            <StatusTag>Progress</StatusTag>
          </Stack>
          <Muted>
            <Link href="/customers/shah">Priya &amp; Morgan Shah</Link> · <Link href="/projects/p-1042">Shah Kitchen Remodel</Link> · Issued Oct 23 · Due Nov 6, 2026
          </Muted>
        </Stack>
        <Stack direction="row" gap={1} flexWrap="wrap">
          <Button>PDF</Button>
          <Button onClick={() => setToast("Payment link copied")}>Copy payment link</Button>
          <Button variant="contained" color="primary" onClick={() => setToast("Reminder sent to priya.shah@gmail.com")}>
            Send reminder
          </Button>
          <Button aria-label="More actions" sx={{ minWidth: 40, width: 40, p: 0 }} onClick={(e) => setMore(e.currentTarget)}>
            <MoreHorizOutlined fontSize="small" />
          </Button>
          <Menu anchorEl={more} open={!!more} onClose={() => setMore(null)}>
            <MenuItem onClick={() => (setMore(null), setToast("Payment recorded"))}>Record offline payment</MenuItem>
            <MenuItem onClick={() => (setMore(null), setVoidOpen(true))} sx={{ color: tokens.danger }}>
              Void invoice…
            </MenuItem>
          </Menu>
        </Stack>
      </Stack>

      <Card component="section" aria-label="Balance" sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(200px,100%),1fr))" }}>
        <Stack gap={0.5} sx={{ p: 2.5, borderRight: `1px solid ${tokens.divider}` }}>
          <Muted sx={{ fontSize: 13 }}>Invoice total</Muted>
          <Num sx={{ fontSize: 22, fontWeight: 500 }}>$29,170.00</Num>
        </Stack>
        <Stack gap={0.5} sx={{ p: 2.5, borderRight: `1px solid ${tokens.divider}` }}>
          <Muted sx={{ fontSize: 13 }}>Paid</Muted>
          <Num sx={{ fontSize: 22, fontWeight: 500 }}>$15,000.00</Num>
        </Stack>
        <Stack gap={1} justifyContent="center" sx={{ p: 2.5, borderRight: `1px solid ${tokens.divider}` }}>
          <Muted sx={{ fontSize: 13 }}>Progress</Muted>
          <LinearProgress variant="determinate" value={51} />
          <Muted sx={{ fontSize: 12.5 }}>51% collected</Muted>
        </Stack>
        <Stack gap={0.5} sx={{ p: 2.5, bgcolor: tokens.brandSoft }}>
          <Box sx={{ fontSize: 13, fontWeight: 500, color: "#8A3410" }}>Balance due</Box>
          <Num sx={{ fontSize: 22, fontWeight: 600, color: tokens.brand }}>$14,170.00</Num>
        </Stack>
      </Card>

      <SplitLayout
        main={
          <>
            <SectionCard title="Line items" action={<Muted sx={{ fontSize: 12.5 }}>Issued — locked</Muted>}>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Description</TableCell>
                      <TableCell align="right">Qty</TableCell>
                      <TableCell align="right">Unit price</TableCell>
                      <TableCell align="right">Amount</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {[
                      ["Rough-in complete", "Payment schedule milestone 2 · 30% of $86,400.00", "$25,920.00"],
                      ["CO-001 · Upgrade to quartz backsplash", "Approved Sep 26", "$2,140.00"],
                      ["CO-003 · Add under-cabinet lighting", "Approved Oct 14", "$1,110.00"],
                    ].map(([t, s, a]) => (
                      <TableRow key={t}>
                        <TableCell>
                          <TwoLine title={t} sub={s} />
                        </TableCell>
                        <TableCell align="right"><Num>1</Num></TableCell>
                        <TableCell align="right"><Num>{a}</Num></TableCell>
                        <TableCell align="right"><Num>{a}</Num></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Stack gap={1} sx={{ ml: "auto", width: { xs: "100%", sm: 340 }, p: 2.5, borderTop: `1px solid ${tokens.divider}` }}>
                <KeyValue k="Subtotal" v={<Num>$29,170.00</Num>} />
                <KeyValue k="Sales tax · per contract snapshot" v={<Num>$0.00</Num>} />
                <KeyValue strong k="Total" v={<Num>$29,170.00</Num>} />
                <KeyValue k="Payments received" v={<Num>−$15,000.00</Num>} />
                <Box sx={{ borderTop: `1px solid ${tokens.divider}`, pt: 1 }}>
                  <KeyValue strong k="Balance due" v={<Num sx={{ color: tokens.brand }}>$14,170.00</Num>} />
                </Box>
              </Stack>
            </SectionCard>
            <SectionCard title="Payments" action={<Muted sx={{ fontSize: 12.5 }}>Status from Stripe webhooks only</Muted>}>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Method</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Amount</TableCell>
                      <TableCell align="right">Fee</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>Oct 27, 8:14 AM</TableCell>
                      <TableCell>Bank transfer (ACH) ••6620</TableCell>
                      <TableCell><StatusTag tone="success">Succeeded</StatusTag></TableCell>
                      <TableCell align="right"><Num>$15,000.00</Num></TableCell>
                      <TableCell align="right"><Num sx={{ color: "text.secondary" }}>$5.00</Num></TableCell>
                      <TableCell align="right">
                        <Button size="small" variant="text" onClick={() => setRefund(true)}>
                          Refund…
                        </Button>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Oct 25, 6:47 PM</TableCell>
                      <TableCell>Visa ••0119</TableCell>
                      <TableCell>
                        <Stack gap={0.25} alignItems="flex-start">
                          <StatusTag tone="danger">Failed</StatusTag>
                          <Muted sx={{ fontSize: 12 }}>Card declined · insufficient funds</Muted>
                        </Stack>
                      </TableCell>
                      <TableCell align="right"><Num sx={{ color: "text.secondary" }}>$29,170.00</Num></TableCell>
                      <TableCell align="right"><Muted>—</Muted></TableCell>
                      <TableCell />
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </SectionCard>
          </>
        }
        side={
          <>
            <SectionCard title="QuickBooks sync" action={<StatusTag tone="danger">Action needed</StatusTag>} bodySx={{ p: 2.5, display: "flex", flexDirection: "column", gap: 1.5 }}>
              <KeyValue k="Invoice" v={<StatusTag tone="success">Synced Oct 23</StatusTag>} />
              <KeyValue k="Payment · $15,000.00" v={<StatusTag tone="danger">Failed · 3 attempts</StatusTag>} />
              <Box sx={{ p: 1.5, borderRadius: "10px", bgcolor: tokens.dangerSoft, color: "#7A1A12", fontSize: 13.5 }}>QuickBooks has two customers named “Priya Shah”. Choose which one this payment belongs to, then retry.</Box>
              <Stack direction="row" gap={1}>
                <Button size="small" component={Link} href="/integrations">
                  Choose customer
                </Button>
                <Button size="small" onClick={() => setToast("Retrying QuickBooks sync…")}>
                  Retry sync
                </Button>
              </Stack>
            </SectionCard>
            <SectionCard title="History" bodySx={{ px: 2.5, py: 1.5 }}>
              {HISTORY.map(([t, m], i) => (
                <Stack key={t} direction="row" gap={1.5} sx={{ py: 1 }}>
                  <Box sx={{ width: 8, height: 8, mt: "7px", borderRadius: "50%", bgcolor: i === 0 ? tokens.brand : "#C9C7BF", flex: "none" }} />
                  <Stack>
                    <Box sx={{ fontWeight: 500, fontSize: 13.5 }}>{t}</Box>
                    <Muted sx={{ fontSize: 12.5 }}>{m}</Muted>
                  </Stack>
                </Stack>
              ))}
            </SectionCard>
            <Card sx={{ p: 2.5, display: "flex", flexDirection: "column", gap: 1.25 }}>
              <Typography variant="h3">Need to correct it?</Typography>
              <Muted sx={{ fontSize: 13.5 }}>Issued invoices can&apos;t be edited. Void it with a reason and issue a corrected invoice — payments stay on record.</Muted>
              <Box>
                <Button onClick={() => setVoidOpen(true)}>Void invoice…</Button>
              </Box>
            </Card>
          </>
        }
      />
      <RefundDialog open={refund} onClose={() => setRefund(false)} onConfirm={() => setToast("Refund sent to Stripe")} />
      <ConfirmDialog
        open={voidOpen}
        onClose={() => setVoidOpen(false)}
        onConfirm={() => setToast(`${no} voided`)}
        destructive
        title={`Void ${no}?`}
        description="The invoice stays on record as void and the customer can no longer pay it. Payments already received stay on record."
        initialValues={{ reason: "" }}
        schema={Yup.object({ reason: Yup.string().trim().min(10, "Give a short reason (10+ characters).").required("A reason is required.") })}
        confirmLabel="Void invoice"
      >
        <FormikTextField name="reason" label="Reason (required)" multiline minRows={3} />
      </ConfirmDialog>
      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)} message={toast} />
    </>
  );
}
