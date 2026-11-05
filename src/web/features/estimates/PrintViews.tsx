"use client";

import PrintOutlined from "@mui/icons-material/PrintOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import { useEffect, useState, type ReactNode } from "react";
import { Muted } from "@web/components/ui";
import type { EstimateDetail } from "@shared/contracts/estimates";
import type { ContractDetail } from "@shared/contracts/proposals";
import { ContractDocumentView } from "@web/features/contracts/ContractDetailView";
import { contractsApi, estimatesApi } from "./api";
import { EstimateDocument } from "./EstimateDetailView";

/** Letter-size print page; the browser's "Save as PDF" produces the PDF. */
function PrintFrame<T>({ load, title, render }: { load: () => Promise<T>; title: (d: T) => string; render: (d: T) => ReactNode }) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    load()
      .then((d) => {
        setData(d);
        document.title = title(d);
        setTimeout(() => window.print(), 400);
      })
      .catch((e: Error) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once
  }, []);
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#F3F3F0", py: 4, px: 2, "@media print": { bgcolor: "#fff", p: 0 } }}>
      <style>{"@page { size: letter; margin: 0.6in; }"}</style>
      <Box sx={{ maxWidth: 820, mx: "auto" }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2, "@media print": { display: "none" } }}>
          <Muted sx={{ fontSize: 13 }}>Choose “Save as PDF” in the print dialog to download a PDF.</Muted>
          <Button variant="contained" color="primary" startIcon={<PrintOutlined />} onClick={() => window.print()} disabled={!data}>
            Print / Save PDF
          </Button>
        </Stack>
        {error ? <Alert severity="error">{error}</Alert> : data ? render(data) : <CircularProgress sx={{ display: "block", mx: "auto", mt: 8 }} />}
      </Box>
    </Box>
  );
}

export function EstimatePrintView({ id, versionId }: { id: string; versionId?: string }) {
  return (
    <PrintFrame<EstimateDetail>
      load={() => estimatesApi.get(id, versionId)}
      title={(e) => `${e.estimate_number} · ${e.customer.display_name}`}
      render={(e) => <EstimateDocument e={e} />}
    />
  );
}

export function ContractPrintView({ id }: { id: string }) {
  return (
    <PrintFrame<ContractDetail>
      load={() => contractsApi.get(id)}
      title={(k) => `${k.contract_number} · ${k.customer.display_name}`}
      render={(k) => (
        <ContractDocumentView
          doc={k.document}
          logoUrl="/api/v1/onboarding/logo"
          signed={k.signature}
          signerName={k.signer?.name ?? k.customer.display_name}
          stamp={k.status === "signed" ? { text: "Signed", color: "#15803D" } : k.status === "voided" ? { text: "Void", color: "#6B7280" } : null}
        />
      )}
    />
  );
}
