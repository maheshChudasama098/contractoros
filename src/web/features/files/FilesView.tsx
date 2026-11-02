"use client";

import CloudUploadOutlined from "@mui/icons-material/CloudUploadOutlined";
import ImageOutlined from "@mui/icons-material/ImageOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import { useRef, useState } from "react";
import { Muted, Num, PageHeader, SectionCard, StatusTag, TwoLine } from "@web/components/ui";
import { tokens, type Tone } from "@web/theme/tokens";

const CATS = [
  ["All files", 23],
  ["Progress photos", 14],
  ["Contracts & signatures", 2],
  ["Estimates", 3],
  ["Invoices", 2],
  ["Permits & inspections", 2],
  ["Shared with customer", 11],
  ["Internal only", 12],
] as const;

const PHOTOS: [string, boolean][] = [
  ["Primed walls", true],
  ["Ceiling lights", true],
  ["Cabinet layout", true],
  ["Gas line in island", false],
  ["Rough-in panel", false],
];

type Doc = { ext: string; name: string; sub: string; linked: string; vis?: "Customer" | "Internal"; visLocked?: boolean; scan: [string, Tone]; by: string; size: string; bad?: boolean };
const INITIAL: Doc[] = [
  { ext: "PDF", name: "CT-0161 signed agreement.pdf", sub: "Signed Sep 4 · immutable", linked: "Contract", vis: "Customer", scan: ["Clean", "success"], by: "System · Sep 4", size: "412 KB" },
  { ext: "PDF", name: "INV-3108.pdf", sub: "Generated at issue", linked: "INV-3108", vis: "Customer", scan: ["Clean", "success"], by: "System · Oct 23", size: "96 KB" },
  { ext: "PDF", name: "Electrical rough-in permit.pdf", sub: "City of Austin", linked: "Project", vis: "Internal", scan: ["Clean", "success"], by: "Marcus Bell · Sep 22", size: "1.2 MB" },
  { ext: "JPG", name: "IMG_4471.heic", sub: "Just uploaded", linked: "Project", vis: "Internal", visLocked: true, scan: ["Scanning…", "info"], by: "Tomás Reyes · now", size: "3.4 MB" },
  { ext: "ZIP", name: "cabinet_specs_final.zip", sub: "Quarantined — can't be downloaded", linked: "Project", vis: "Internal", visLocked: true, scan: ["Infected", "danger"], by: "Email import · Oct 26", size: "8.9 MB", bad: true },
];

const MAX = 25 * 1024 * 1024;
const OK_TYPES = /\.(jpe?g|png|heic|pdf)$/i;

export function FilesView() {
  const [cat, setCat] = useState<string>("All files");
  const [docs, setDocs] = useState(INITIAL);
  const [drag, setDrag] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const accept = (files: FileList | null) => {
    if (!files?.length) return;
    const ok: Doc[] = [];
    const rejected: string[] = [];
    for (const f of Array.from(files)) {
      if (!OK_TYPES.test(f.name)) rejected.push(`${f.name} (type not allowed)`);
      else if (f.size > MAX) rejected.push(`${f.name} (over 25 MB)`);
      else ok.push({ ext: f.name.split(".").pop()!.toUpperCase(), name: f.name, sub: "Just uploaded", linked: "Project", vis: "Internal", visLocked: true, scan: ["Scanning…", "info"], by: "Dana Ruiz · now", size: `${(f.size / 1024 / 1024).toFixed(1)} MB` });
    }
    setDocs((d) => [...ok, ...d]);
    setToast(rejected.length ? `Not uploaded: ${rejected.join(", ")}` : `${ok.length} file${ok.length === 1 ? "" : "s"} uploaded · scanning`);
  };

  return (
    <>
      <PageHeader
        title="Files & documents"
        subtitle="New uploads are internal until you share them with the customer."
        actions={
          <>
            <Button>Project: Shah Kitchen Remodel</Button>
            <Button variant="contained" color="primary" startIcon={<CloudUploadOutlined />} onClick={() => input.current?.click()}>
              Upload
            </Button>
          </>
        }
      />
      <Box sx={{ display: "grid", gap: 3, alignItems: "start", gridTemplateColumns: { xs: "1fr", md: "220px minmax(0,1fr)" } }}>
        <Stack component="nav" aria-label="Document types" gap={0.25} direction={{ xs: "row", md: "column" }} sx={{ overflowX: "auto" }}>
          {CATS.map(([l, n]) => (
            <Box
              key={l}
              component="button"
              type="button"
              aria-current={cat === l ? "page" : undefined}
              onClick={() => setCat(l)}
              sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, height: 36, px: 1.25, border: 0, borderRadius: "7px", font: "inherit", fontSize: 13.5, fontWeight: 500, whiteSpace: "nowrap", cursor: "pointer", bgcolor: cat === l ? "#fff" : "transparent", boxShadow: cat === l ? "0 1px 2px rgba(16,24,40,.06)" : undefined, color: cat === l ? tokens.ink : tokens.ink2, "&:hover": { bgcolor: cat === l ? "#fff" : tokens.hover } }}
            >
              {l}
              <Num sx={{ fontSize: 12, color: "text.secondary" }}>{n}</Num>
            </Box>
          ))}
        </Stack>
        <Stack gap={3} minWidth={0}>
          <Box
            component="label"
            onDragOver={(e: React.DragEvent) => (e.preventDefault(), setDrag(true))}
            onDragLeave={() => setDrag(false)}
            onDrop={(e: React.DragEvent) => {
              e.preventDefault();
              setDrag(false);
              accept(e.dataTransfer.files);
            }}
            sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5, p: 3, borderRadius: "12px", border: `1.5px dashed ${drag ? tokens.brand : "#C9C7BF"}`, bgcolor: drag ? tokens.brandSoft : "#fff", cursor: "pointer", textAlign: "center" }}
          >
            <CloudUploadOutlined sx={{ color: "text.secondary" }} />
            <Box sx={{ fontWeight: 500 }}>
              Drop files here or <Box component="span" sx={{ color: tokens.brand }}>browse</Box>
            </Box>
            <Muted sx={{ fontSize: 12.5 }}>JPG, PNG, HEIC, PDF up to 25 MB · scanned before they can be opened</Muted>
            <input ref={input} type="file" multiple hidden accept=".jpg,.jpeg,.png,.heic,.pdf" onChange={(e) => (accept(e.target.files), (e.target.value = ""))} />
          </Box>

          <SectionCard title="Recent photos" action={<a href="#">View all 14</a>} bodySx={{ p: 2, display: "grid", gap: 1.5, gridTemplateColumns: "repeat(auto-fill, minmax(140px,1fr))" }}>
            {PHOTOS.map(([l, shared]) => (
              <Stack key={l} gap={0.75}>
                <Stack alignItems="center" justifyContent="center" gap={0.5} sx={{ aspectRatio: "4/3", borderRadius: "8px", bgcolor: "#E9E7E1", color: "text.secondary", fontSize: 12 }}>
                  <ImageOutlined fontSize="small" />
                  {l}
                </Stack>
                <Box>
                  <StatusTag tone={shared ? "success" : "neutral"}>{shared ? "Customer" : "Internal"}</StatusTag>
                </Box>
              </Stack>
            ))}
          </SectionCard>

          <Card component="section" aria-label="Documents">
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Linked to</TableCell>
                    <TableCell>Visibility</TableCell>
                    <TableCell>Scan</TableCell>
                    <TableCell>Uploaded</TableCell>
                    <TableCell align="right">Size</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {docs.map((d, i) => (
                    <TableRow key={d.name + i} hover>
                      <TableCell>
                        <Stack direction="row" gap={1.25} alignItems="center">
                          <Box sx={{ width: 34, height: 34, borderRadius: "6px", bgcolor: d.bad ? tokens.dangerSoft : "#F0EFEB", color: d.bad ? tokens.danger : "#4A4E57", display: "grid", placeItems: "center", fontSize: 10, fontWeight: 600, flex: "none" }}>{d.ext}</Box>
                          <TwoLine title={d.name} sub={<Box component="span" sx={{ color: d.bad ? tokens.danger : undefined }}>{d.sub}</Box>} />
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ color: "text.secondary" }}>{d.linked}</TableCell>
                      <TableCell>
                        {d.visLocked ? (
                          <Muted>{d.vis}</Muted>
                        ) : (
                          <Select
                            size="small"
                            value={d.vis}
                            inputProps={{ "aria-label": `Visibility of ${d.name}` }}
                            onChange={(e) => setDocs((ds) => ds.map((x, j) => (j === i ? { ...x, vis: e.target.value as Doc["vis"] } : x)))}
                            sx={{ "& .MuiSelect-select": { height: 32, py: 0, fontSize: 13 } }}
                          >
                            <MenuItem value="Customer">Customer</MenuItem>
                            <MenuItem value="Internal">Internal</MenuItem>
                          </Select>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusTag tone={d.scan[1]}>{d.scan[0]}</StatusTag>
                      </TableCell>
                      <TableCell sx={{ color: "text.secondary", whiteSpace: "nowrap" }}>{d.by}</TableCell>
                      <TableCell align="right">
                        <Num sx={{ color: "text.secondary" }}>{d.size}</Num>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Stack>
      </Box>
      <Snackbar open={!!toast} autoHideDuration={5000} onClose={() => setToast(null)} message={toast} />
    </>
  );
}
