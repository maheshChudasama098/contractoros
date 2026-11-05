"use client";

import PrintOutlined from "@mui/icons-material/PrintOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import { useEffect, useState } from "react";
import type { InvoiceDetail } from "@shared/contracts/invoices";
import { Muted } from "@web/components/ui";
import { invoicesApi } from "./api";
import { InvoicePaper } from "./InvoicePaper";

/** Letter-size page; the browser's "Save as PDF" produces the PDF. */
export function InvoicePrintView({ id }: { id: string }) {
  const [inv, setInv] = useState<InvoiceDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    invoicesApi
      .get(id)
      .then((d) => {
        setInv(d);
        document.title = `${d.invoice_number} · ${d.customer.display_name}`;
        setTimeout(() => window.print(), 400); // let the logo load first
      })
      .catch((e: Error) => setError(e.message));
  }, [id]);

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#F3F3F0", py: 4, px: 2, "@media print": { bgcolor: "#fff", p: 0 } }}>
      <style>{"@page { size: letter; margin: 0.6in; }"}</style>
      <Box sx={{ maxWidth: 820, mx: "auto" }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2, "@media print": { display: "none" } }}>
          <Muted sx={{ fontSize: 13 }}>Choose “Save as PDF” in the print dialog to download a PDF.</Muted>
          <Button variant="contained" color="primary" startIcon={<PrintOutlined />} onClick={() => window.print()} disabled={!inv}>
            Print / Save PDF
          </Button>
        </Stack>
        {error ? <Alert severity="error">{error}</Alert> : inv ? <InvoicePaper inv={inv} /> : <CircularProgress sx={{ display: "block", mx: "auto", mt: 8 }} />}
      </Box>
    </Box>
  );
}
