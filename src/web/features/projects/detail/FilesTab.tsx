"use client";

import CloudUploadOutlined from "@mui/icons-material/CloudUploadOutlined";
import DeleteOutline from "@mui/icons-material/DeleteOutline";
import DownloadOutlined from "@mui/icons-material/DownloadOutlined";
import FolderOutlined from "@mui/icons-material/FolderOutlined";
import InsertDriveFileOutlined from "@mui/icons-material/InsertDriveFileOutlined";
import PictureAsPdfOutlined from "@mui/icons-material/PictureAsPdfOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import { useCallback, useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "@web/components/dialogs";
import { EmptyState, Muted, SectionCard, Segmented } from "@web/components/ui";
import { tokens } from "@web/theme/tokens";
import { PROJECT_FILE_MAX_BYTES, type ProjectFileDto } from "@shared/contracts/project-detail";
import { applyApiError } from "@web/features/customers/api";
import { fmtBytes, fmtWhen, type ProjectDetailApi } from "./api";

type Filter = "all" | "photos" | "documents";
const ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp,.heic,.doc,.docx,.xls,.xlsx,.csv,.txt,.dwg";

export function FilesTab({ api }: { api: ProjectDetailApi }) {
  const [files, setFiles] = useState<ProjectFileDto[] | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [deleting, setDeleting] = useState<ProjectFileDto | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    api.files().then((f) => (setFiles(f), setError(null))).catch((e: Error) => setError(e.message));
  }, [api]);
  useEffect(load, [load]);

  const uploadAll = async (list: FileList | File[] | null) => {
    const picked = [...(list ?? [])];
    if (input.current) input.current.value = "";
    if (!picked.length) return;
    const tooBig = picked.filter((f) => f.size > PROJECT_FILE_MAX_BYTES);
    const ok = picked.filter((f) => f.size <= PROJECT_FILE_MAX_BYTES);
    const failed: string[] = tooBig.map((f) => `${f.name}: larger than 20 MB`);
    setUploading(ok.length);
    for (const f of ok) {
      try {
        await api.uploadFile(f);
      } catch (e) {
        failed.push(`${f.name}: ${applyApiError(e, (_, m) => failed.push(`${f.name}: ${m}`)) ?? ""}`.replace(/: $/, ""));
      }
      setUploading((n) => n - 1);
    }
    load();
    setToast(failed.length ? `Not uploaded — ${failed.join("; ")}` : `${ok.length} file${ok.length === 1 ? "" : "s"} uploaded`);
  };

  const rows = (files ?? []).filter((f) => (filter === "all" ? true : filter === "photos" ? f.is_image : !f.is_image));

  return (
    <>
      {error && <Alert severity="error">{error}</Alert>}
      <Box
        onDragOver={(e) => (e.preventDefault(), setDragging(true))}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => (e.preventDefault(), setDragging(false), uploadAll(e.dataTransfer.files))}
        onClick={() => input.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && input.current?.click()}
        sx={{
          border: `2px dashed ${dragging ? tokens.brand : tokens.borderStrong}`,
          bgcolor: dragging ? tokens.brandSoft : "#fff",
          borderRadius: "12px",
          py: 3.5,
          textAlign: "center",
          cursor: "pointer",
          transition: "all .15s",
          "&:hover": { borderColor: tokens.brand },
        }}
      >
        <CloudUploadOutlined sx={{ fontSize: 32, color: tokens.brand }} />
        <Box sx={{ fontWeight: 600, mt: 0.5 }}>Drop files here or click to upload</Box>
        <Muted sx={{ fontSize: 12.5 }}>Photos, PDFs, Word, Excel, CSV, text or DWG · up to 20 MB each</Muted>
        {uploading > 0 && <LinearProgress sx={{ mx: "auto", mt: 1.5, maxWidth: 240 }} />}
      </Box>
      <input ref={input} type="file" multiple hidden accept={ACCEPT} onChange={(e) => uploadAll(e.target.files)} />

      <SectionCard
        title={`Files${files ? ` (${files.length})` : ""}`}
        action={
          <Segmented
            label="Filter files"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "All" },
              { value: "photos", label: "Photos" },
              { value: "documents", label: "Documents" },
            ]}
          />
        }
        bodySx={{ p: rows.length ? 2 : 0 }}
      >
        {files && rows.length === 0 ? (
          <EmptyState icon={<FolderOutlined />} title={files.length ? "Nothing in this filter" : "No files yet"} body={files.length ? undefined : "Upload plans, permits, contracts and job-site photos."} />
        ) : (
          <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))" }}>
            {rows.map((f) => (
              <Box key={f.id} sx={{ border: `1px solid ${tokens.border}`, borderRadius: "10px", overflow: "hidden", bgcolor: "#fff", display: "flex", flexDirection: "column" }}>
                <Box
                  component="a"
                  href={api.fileUrl(f.id)}
                  target="_blank"
                  rel="noopener"
                  sx={{ height: 130, bgcolor: tokens.surfaceMuted, display: "grid", placeItems: "center", overflow: "hidden" }}
                >
                  {f.is_image ? (
                    // eslint-disable-next-line @next/next/no-img-element -- auth-protected API image, not a static asset
                    <img src={api.fileUrl(f.id)} alt={f.filename} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : f.mime_type === "application/pdf" ? (
                    <PictureAsPdfOutlined sx={{ fontSize: 40, color: "#DC2626" }} />
                  ) : (
                    <InsertDriveFileOutlined sx={{ fontSize: 40, color: "text.secondary" }} />
                  )}
                </Box>
                <Stack direction="row" alignItems="center" gap={0.5} sx={{ px: 1.25, py: 1 }}>
                  <Stack sx={{ flex: 1, minWidth: 0 }}>
                    <Tooltip title={f.filename}>
                      <Box sx={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.filename}</Box>
                    </Tooltip>
                    <Muted sx={{ fontSize: 11.5 }}>
                      {fmtBytes(f.size_bytes)} · {fmtWhen(f.created_at)}
                    </Muted>
                  </Stack>
                  <IconButton size="small" component="a" href={api.fileUrl(f.id, true)} aria-label={`Download ${f.filename}`}>
                    <DownloadOutlined sx={{ fontSize: 18 }} />
                  </IconButton>
                  <IconButton size="small" aria-label={`Delete ${f.filename}`} onClick={() => setDeleting(f)}>
                    <DeleteOutline sx={{ fontSize: 18, color: tokens.danger }} />
                  </IconButton>
                </Stack>
              </Box>
            ))}
          </Box>
        )}
      </SectionCard>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        destructive
        title={`Delete ${deleting?.filename}?`}
        description="The file is removed from this project for everyone."
        confirmLabel="Delete file"
        onConfirm={async () => {
          try {
            await api.deleteFile(deleting!.id);
            setToast("File deleted");
            load();
          } catch (e) {
            setToast(applyApiError(e, () => {}) ?? "Could not delete file");
          }
        }}
      />
      <Snackbar open={!!toast} autoHideDuration={5000} onClose={() => setToast(null)} message={toast} />
    </>
  );
}
