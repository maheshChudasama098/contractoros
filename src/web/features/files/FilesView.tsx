"use client";

import ChevronRight from "@mui/icons-material/ChevronRight";
import CloudUploadOutlined from "@mui/icons-material/CloudUploadOutlined";
import CreateNewFolderOutlined from "@mui/icons-material/CreateNewFolderOutlined";
import DescriptionOutlined from "@mui/icons-material/DescriptionOutlined";
import FolderOutlined from "@mui/icons-material/FolderOutlined";
import GridViewOutlined from "@mui/icons-material/GridViewOutlined";
import HomeOutlined from "@mui/icons-material/HomeOutlined";
import ImageOutlined from "@mui/icons-material/ImageOutlined";
import InsertDriveFileOutlined from "@mui/icons-material/InsertDriveFileOutlined";
import MoreHoriz from "@mui/icons-material/MoreHoriz";
import PictureAsPdfOutlined from "@mui/icons-material/PictureAsPdfOutlined";
import TableChartOutlined from "@mui/icons-material/TableChartOutlined";
import ViewListOutlined from "@mui/icons-material/ViewListOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import ListItemIcon from "@mui/material/ListItemIcon";
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
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { Form, Formik } from "formik";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type ReactNode } from "react";
import { ConfirmDialog } from "@web/components/dialogs";
import { FormikTextField } from "@web/components/form";
import {
  EmptyState,
  FilterSelect,
  FormDrawer,
  ListCard,
  Muted,
  PageHeader,
  SearchField,
  Segmented,
  SortHead,
  sortRows,
  type Sort,
} from "@web/components/ui";
import { Yup } from "@web/lib/validation";
import { tokens } from "@web/theme/tokens";
import { applyApiError } from "@web/features/customers/api";
import { fmtBytes, fmtWhen } from "@web/features/projects/detail/api";
import {
  LIBRARY_ACCEPT,
  LIBRARY_FILE_MAX_BYTES,
  type FileBrowseResult,
  type FileKind,
  type FolderDto,
  type FolderTreeNode,
  type LibraryFileDto,
} from "@shared/contracts/files";
import { filesApi } from "./api";

type Row = { type: "folder"; folder: FolderDto } | { type: "file"; file: LibraryFileDto };
type SortKey = "name" | "size" | "owner" | "date";
type View = "list" | "grid";
type Target = Row | null;

const KIND_OPTIONS: { value: FileKind; label: string }[] = [
  { value: "all", label: "Everything" },
  { value: "folders", label: "Folders" },
  { value: "images", label: "Photos" },
  { value: "pdf", label: "PDFs" },
  { value: "documents", label: "Documents" },
];

const rowName = (r: Row) => (r.type === "folder" ? r.folder.name : r.file.name);
const rowKey = (r: Row) => `${r.type}:${r.type === "folder" ? r.folder.id : r.file.id}`;
const folderSummary = (f: FolderDto) =>
  [f.folder_count && `${f.folder_count} folder${f.folder_count === 1 ? "" : "s"}`, `${f.file_count} file${f.file_count === 1 ? "" : "s"}`]
    .filter(Boolean)
    .join(", ");

function FileIcon({ file, size = 22 }: { file: LibraryFileDto; size?: number }) {
  const m = file.mime_type;
  const sx = { fontSize: size };
  if (m.startsWith("image/")) return <ImageOutlined sx={{ ...sx, color: "#0E7490" }} />;
  if (m === "application/pdf") return <PictureAsPdfOutlined sx={{ ...sx, color: "#DC2626" }} />;
  if (m.includes("sheet") || m.includes("excel") || m === "text/csv") return <TableChartOutlined sx={{ ...sx, color: "#15803D" }} />;
  if (m.includes("word") || m === "text/plain") return <DescriptionOutlined sx={{ ...sx, color: "#1D4ED8" }} />;
  return <InsertDriveFileOutlined sx={{ ...sx, color: "text.secondary" }} />;
}
const FolderIcon = ({ size = 22 }: { size?: number }) => <FolderOutlined sx={{ fontSize: size, color: tokens.brand }} />;

export function FilesView() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const folderId = params.get("folder");

  const [data, setData] = useState<FileBrowseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<FileKind>("all");
  const [view, setView] = useState<View>("list");
  const [sort, setSort] = useState<Sort<SortKey>>({ key: "name", dir: "asc" });
  const [uploads, setUploads] = useState<{ done: number; total: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [menu, setMenu] = useState<{ el: HTMLElement; row: Row } | null>(null);
  const [naming, setNaming] = useState<Target | "new" | null>(null);
  const [moving, setMoving] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState<Row | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);

  const open = useCallback(
    (id: string | null) => {
      setQ("");
      router.push(id ? `${pathname}?folder=${id}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  const load = useCallback(() => {
    setLoading(true);
    filesApi
      .browse({ folder_id: folderId, q: q.trim() || undefined, kind })
      .then((d) => (setData(d), setError(null)))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [folderId, q, kind]);

  useEffect(() => {
    const t = setTimeout(load, q ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  const rows = useMemo<Row[]>(() => {
    if (!data) return [];
    const value = (r: Row, k: SortKey) => {
      if (k === "name") return rowName(r).toLowerCase();
      if (k === "size") return r.type === "folder" ? r.folder.file_count : r.file.size_bytes;
      if (k === "owner") return r.type === "folder" ? r.folder.created_by : r.file.uploaded_by;
      return r.type === "folder" ? r.folder.updated_at : r.file.created_at;
    };
    // Folders always stay above files.
    const folders = sortRows<Row, SortKey>(data.folders.map((folder) => ({ type: "folder", folder })), sort, value);
    const files = sortRows<Row, SortKey>(data.files.map((file) => ({ type: "file", file })), sort, value);
    return [...folders, ...files];
  }, [data, sort]);

  const canWrite = !!data?.can_write;
  const searching = !!q.trim();

  const uploadAll = async (list: FileList | File[] | null) => {
    const picked = [...(list ?? [])];
    if (input.current) input.current.value = "";
    if (!picked.length || !canWrite) return;
    const failed = picked.filter((f) => f.size > LIBRARY_FILE_MAX_BYTES).map((f) => `${f.name}: larger than 25 MB`);
    const ok = picked.filter((f) => f.size <= LIBRARY_FILE_MAX_BYTES);
    setUploads({ done: 0, total: ok.length });
    let uploaded = 0;
    for (const f of ok) {
      try {
        await filesApi.upload(f, folderId);
        uploaded++;
      } catch (e) {
        const fieldMsgs: string[] = [];
        const msg = applyApiError(e, (_, m) => fieldMsgs.push(m));
        failed.push(`${f.name}: ${fieldMsgs[0] ?? msg ?? "failed"}`);
      }
      setUploads((u) => u && { ...u, done: u.done + 1 });
    }
    setUploads(null);
    load();
    setToast(failed.length ? `${uploaded} uploaded. Not uploaded — ${failed.join("; ")}` : `${uploaded} file${uploaded === 1 ? "" : "s"} uploaded`);
  };

  const dropHandlers = canWrite
    ? {
        onDragEnter: (e: DragEvent) => {
          if (!e.dataTransfer.types.includes("Files")) return;
          e.preventDefault();
          dragDepth.current++;
          setDragging(true);
        },
        onDragOver: (e: DragEvent) => e.dataTransfer.types.includes("Files") && e.preventDefault(),
        onDragLeave: () => {
          dragDepth.current = Math.max(0, dragDepth.current - 1);
          if (!dragDepth.current) setDragging(false);
        },
        onDrop: (e: DragEvent) => {
          e.preventDefault();
          dragDepth.current = 0;
          setDragging(false);
          void uploadAll(e.dataTransfer.files);
        },
      }
    : {};

  const activate = (r: Row) => (r.type === "folder" ? open(r.folder.id) : window.open(filesApi.fileUrl(r.file.id), "_blank", "noopener"));

  const usage = data ? `${data.usage.files} file${data.usage.files === 1 ? "" : "s"} · ${fmtBytes(data.usage.bytes)} used` : "";

  return (
    <>
      <PageHeader
        title="Files"
        subtitle={`Plans, permits, contracts and photos in folders your whole team can reach.${usage ? ` ${usage}.` : ""}`}
        actions={
          canWrite && (
            <Stack direction="row" gap={1}>
              <Button variant="outlined" startIcon={<CreateNewFolderOutlined />} onClick={() => setNaming("new")}>
                New folder
              </Button>
              <Button variant="contained" color="primary" startIcon={<CloudUploadOutlined />} onClick={() => input.current?.click()}>
                Upload
              </Button>
            </Stack>
          )
        }
      />
      <input ref={input} type="file" multiple hidden accept={LIBRARY_ACCEPT} onChange={(e) => uploadAll(e.target.files)} />

      <Breadcrumbs crumbs={data?.breadcrumbs ?? []} searching={searching} onOpen={open} />

      {error && <Alert severity="error">{error}</Alert>}

      <Box {...dropHandlers} sx={{ position: "relative" }}>
        <ListCard
          search={<SearchField label="Search files" placeholder="Search all files and folders…" value={q} onChange={setQ} />}
          filters={
            <>
              <FilterSelect label="Show" value={kind} options={KIND_OPTIONS} onChange={setKind} />
              <Segmented<View>
                label="View"
                value={view}
                onChange={setView}
                options={[
                  { value: "list", label: <ViewListOutlined sx={{ fontSize: 18 }} aria-label="List" /> },
                  { value: "grid", label: <GridViewOutlined sx={{ fontSize: 18 }} aria-label="Grid" /> },
                ]}
              />
            </>
          }
        >
          {(loading || uploads) && (
            <LinearProgress
              variant={uploads?.total ? "determinate" : "indeterminate"}
              value={uploads?.total ? (uploads.done / uploads.total) * 100 : undefined}
              sx={{ height: 2 }}
            />
          )}
          {uploads && (
            <Muted sx={{ px: 2.5, pt: 1.25, fontSize: 13 }}>
              Uploading {Math.min(uploads.done + 1, uploads.total)} of {uploads.total}…
            </Muted>
          )}

          {data && rows.length === 0 ? (
            <EmptyState
              icon={searching ? <DescriptionOutlined /> : <FolderOutlined />}
              title={searching ? "No matches" : kind !== "all" ? "Nothing of this type here" : data.folder ? "This folder is empty" : "No files yet"}
              body={
                searching
                  ? "Try a different name. Search looks in every folder."
                  : canWrite
                    ? "Drag files here, or create a folder to keep things organized."
                    : undefined
              }
              action={
                canWrite && !searching ? (
                  <Stack direction="row" gap={1}>
                    <Button variant="outlined" onClick={() => setNaming("new")}>
                      New folder
                    </Button>
                    <Button variant="contained" color="primary" onClick={() => input.current?.click()}>
                      Upload files
                    </Button>
                  </Stack>
                ) : undefined
              }
            />
          ) : view === "list" ? (
            <ListBody rows={rows} sort={sort} onSort={setSort} searching={searching} onActivate={activate} onMenu={canWrite ? (el, row) => setMenu({ el, row }) : undefined} />
          ) : (
            <GridBody rows={rows} searching={searching} onActivate={activate} onMenu={canWrite ? (el, row) => setMenu({ el, row }) : undefined} />
          )}
        </ListCard>

        {dragging && (
          <Stack
            alignItems="center"
            justifyContent="center"
            gap={1}
            sx={{
              position: "absolute",
              inset: 0,
              zIndex: 2,
              borderRadius: "12px",
              border: `2px dashed ${tokens.brand}`,
              bgcolor: "rgba(251,238,231,0.92)",
              pointerEvents: "none",
            }}
          >
            <CloudUploadOutlined sx={{ fontSize: 40, color: tokens.brand }} />
            <Typography sx={{ fontWeight: 600 }}>Drop to upload to {data?.folder?.name ?? "Files"}</Typography>
            <Muted sx={{ fontSize: 13 }}>PDF, photos, Word, Excel, CSV, text or DWG · up to 25 MB each</Muted>
          </Stack>
        )}
      </Box>

      <Menu anchorEl={menu?.el} open={!!menu} onClose={() => setMenu(null)}>
        {menu?.row.type === "file" && (
          <MenuItem component="a" href={filesApi.fileUrl(menu.row.file.id, true)} onClick={() => setMenu(null)}>
            Download
          </MenuItem>
        )}
        {menu?.row.type === "folder" && <MenuItem onClick={() => (open(menu.row.type === "folder" ? menu.row.folder.id : null), setMenu(null))}>Open</MenuItem>}
        <MenuItem onClick={() => (setNaming(menu!.row), setMenu(null))}>Rename</MenuItem>
        <MenuItem onClick={() => (setMoving(menu!.row), setMenu(null))}>Move to…</MenuItem>
        <MenuItem sx={{ color: "error.main" }} onClick={() => (setDeleting(menu!.row), setMenu(null))}>
          Delete
        </MenuItem>
      </Menu>

      {naming && (
        <NameDrawer
          target={naming === "new" ? null : naming}
          parentId={folderId}
          parentName={data?.folder?.name ?? "Files"}
          onClose={() => setNaming(null)}
          onSaved={(msg) => (setNaming(null), setToast(msg), load())}
        />
      )}
      {moving && <MoveDrawer row={moving} onClose={() => setMoving(null)} onMoved={(msg) => (setMoving(null), setToast(msg), load())} />}

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        destructive
        title={deleting ? `Delete ${rowName(deleting)}?` : ""}
        description={
          deleting?.type === "folder"
            ? `This deletes the folder and everything inside it (${folderSummary(deleting.folder)} at the top level). This can't be undone.`
            : "The file is deleted for everyone. This can't be undone."
        }
        confirmLabel={deleting?.type === "folder" ? "Delete folder" : "Delete file"}
        onConfirm={async () => {
          const r = deleting!;
          try {
            if (r.type === "folder") {
              const res = await filesApi.removeFolder(r.folder.id);
              setToast(`Folder deleted${res.files ? ` with ${res.files} file${res.files === 1 ? "" : "s"}` : ""}`);
            } else {
              await filesApi.removeFile(r.file.id);
              setToast("File deleted");
            }
            load();
          } catch (e) {
            setToast(applyApiError(e, () => {}) ?? "Could not delete");
          }
        }}
      />
      <Snackbar open={!!toast} autoHideDuration={5000} onClose={() => setToast(null)} message={toast} />
    </>
  );
}

// ---------------------------------------------------------------- Breadcrumbs

function Breadcrumbs({ crumbs, searching, onOpen }: { crumbs: { id: string; name: string }[]; searching: boolean; onOpen: (id: string | null) => void }) {
  const all = [{ id: null as string | null, name: "Files" }, ...crumbs];
  return (
    <Stack direction="row" alignItems="center" flexWrap="wrap" gap={0.25} sx={{ mt: -1 }} aria-label="Folder path">
      {all.map((c, i) => {
        const last = i === all.length - 1;
        return (
          <Stack key={c.id ?? "root"} direction="row" alignItems="center" gap={0.25}>
            {i > 0 && <ChevronRight sx={{ fontSize: 18, color: "text.disabled" }} />}
            <ButtonBase
              onClick={() => onOpen(c.id)}
              disabled={last && !searching}
              sx={{
                px: 0.75,
                py: 0.25,
                borderRadius: "6px",
                fontSize: 14,
                fontWeight: last ? 600 : 500,
                color: last ? "text.primary" : "text.secondary",
                gap: 0.5,
                "&:hover": { bgcolor: tokens.surfaceMuted, color: "text.primary" },
              }}
            >
              {i === 0 && <HomeOutlined sx={{ fontSize: 17 }} />}
              {c.name}
            </ButtonBase>
          </Stack>
        );
      })}
      {searching && <Muted sx={{ fontSize: 13, ml: 1 }}>· searching all folders</Muted>}
    </Stack>
  );
}

// ---------------------------------------------------------------- List / grid

type BodyProps = {
  rows: Row[];
  searching: boolean;
  onActivate: (r: Row) => void;
  onMenu?: (el: HTMLElement, r: Row) => void;
};

function RowMenuButton({ row, onMenu }: { row: Row; onMenu?: BodyProps["onMenu"] }) {
  if (!onMenu) return null;
  return (
    <IconButton
      size="small"
      aria-label={`Actions for ${rowName(row)}`}
      onClick={(e) => {
        e.stopPropagation();
        onMenu(e.currentTarget, row);
      }}
    >
      <MoreHoriz fontSize="small" />
    </IconButton>
  );
}

function ListBody({ rows, sort, onSort, searching, onActivate, onMenu }: BodyProps & { sort: Sort<SortKey>; onSort: (s: Sort<SortKey>) => void }) {
  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <SortHead k="name" sort={sort} onSort={onSort}>
              Name
            </SortHead>
            <SortHead k="size" sort={sort} onSort={onSort}>
              Size
            </SortHead>
            <SortHead k="owner" sort={sort} onSort={onSort}>
              Added by
            </SortHead>
            <SortHead k="date" sort={sort} onSort={onSort}>
              Modified
            </SortHead>
            <TableCell width={56} />
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r) => {
            const isFolder = r.type === "folder";
            const location = isFolder ? r.folder.path : r.file.path;
            return (
              <TableRow
                key={rowKey(r)}
                hover
                tabIndex={0}
                onClick={() => onActivate(r)}
                onKeyDown={(e) => e.key === "Enter" && onActivate(r)}
                sx={{ cursor: "pointer" }}
              >
                <TableCell>
                  <Stack direction="row" alignItems="center" gap={1.5}>
                    {isFolder ? <FolderIcon /> : <FileIcon file={r.file} />}
                    <Stack sx={{ minWidth: 0 }}>
                      <Box sx={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 420 }}>{rowName(r)}</Box>
                      {searching && <Muted sx={{ fontSize: 12 }}>{location}</Muted>}
                    </Stack>
                  </Stack>
                </TableCell>
                <TableCell sx={{ color: "text.secondary", whiteSpace: "nowrap" }}>
                  {isFolder ? folderSummary(r.folder) : fmtBytes(r.file.size_bytes)}
                </TableCell>
                <TableCell sx={{ color: "text.secondary" }}>{(isFolder ? r.folder.created_by : r.file.uploaded_by) ?? "—"}</TableCell>
                <TableCell sx={{ color: "text.secondary", whiteSpace: "nowrap" }}>
                  {fmtWhen(isFolder ? r.folder.updated_at : r.file.created_at)}
                </TableCell>
                <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                  <RowMenuButton row={r} onMenu={onMenu} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function GridBody({ rows, searching, onActivate, onMenu }: BodyProps) {
  return (
    <Box sx={{ p: 2, display: "grid", gap: 1.5, gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}>
      {rows.map((r) => {
        const isFolder = r.type === "folder";
        return (
          <Box
            key={rowKey(r)}
            role="button"
            tabIndex={0}
            onClick={() => onActivate(r)}
            onKeyDown={(e) => e.key === "Enter" && onActivate(r)}
            sx={{
              border: `1px solid ${tokens.border}`,
              borderRadius: "10px",
              overflow: "hidden",
              bgcolor: "#fff",
              cursor: "pointer",
              transition: "border-color .15s, box-shadow .15s",
              "&:hover": { borderColor: tokens.borderStrong, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" },
            }}
          >
            <Box sx={{ height: 112, bgcolor: isFolder ? tokens.brandSoft : tokens.surfaceMuted, display: "grid", placeItems: "center", overflow: "hidden" }}>
              {isFolder ? (
                <FolderIcon size={44} />
              ) : r.file.is_image ? (
                // eslint-disable-next-line @next/next/no-img-element -- auth-protected API image, not a static asset
                <img src={filesApi.fileUrl(r.file.id)} alt={r.file.name} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <FileIcon file={r.file} size={40} />
              )}
            </Box>
            <Stack direction="row" alignItems="center" gap={0.5} sx={{ px: 1.25, py: 1 }}>
              <Stack sx={{ flex: 1, minWidth: 0 }}>
                <Tooltip title={rowName(r)}>
                  <Box sx={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{rowName(r)}</Box>
                </Tooltip>
                <Muted sx={{ fontSize: 11.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {searching ? (isFolder ? r.folder.path : r.file.path) : isFolder ? folderSummary(r.folder) : fmtBytes(r.file.size_bytes)}
                </Muted>
              </Stack>
              <RowMenuButton row={r} onMenu={onMenu} />
            </Stack>
          </Box>
        );
      })}
    </Box>
  );
}

// ---------------------------------------------------------------- Drawers

/** New folder, or rename a folder/file. */
function NameDrawer({
  target,
  parentId,
  parentName,
  onClose,
  onSaved,
}: {
  target: Row | null;
  parentId: string | null;
  parentName: string;
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const isFile = target?.type === "file";
  const current = target ? rowName(target) : "";
  // Files keep their extension; only the base name is edited.
  const ext = isFile ? (current.match(/\.[^.]+$/)?.[0] ?? "") : "";
  const base = ext ? current.slice(0, -ext.length) : current;
  const title = !target ? "New folder" : `Rename ${isFile ? "file" : "folder"}`;

  return (
    <FormDrawer open onClose={onClose} width={440}>
      <Formik
        initialValues={{ name: base }}
        validationSchema={Yup.object({
          name: Yup.string()
            .trim()
            .required("Name is required.")
            .max(isFile ? 240 : 120)
            .matches(/^[^\\/]*$/, "Names can't contain / or \\."),
        })}
        onSubmit={async ({ name }, { setStatus, setFieldError }) => {
          setStatus(null);
          try {
            if (!target) {
              await filesApi.createFolder({ name: name.trim(), parent_id: parentId });
              onSaved(`Folder “${name.trim()}” created`);
            } else if (target.type === "folder") {
              await filesApi.updateFolder(target.folder.id, { name: name.trim() });
              onSaved("Folder renamed");
            } else {
              await filesApi.updateFile(target.file.id, { name: `${name.trim()}${ext}` });
              onSaved("File renamed");
            }
          } catch (e) {
            setStatus(applyApiError(e, setFieldError));
          }
        }}
      >
        {({ isSubmitting, status }) => (
          <Form noValidate>
            <DialogTitle>{title}</DialogTitle>
            <DialogContent>
              <Stack gap={2}>
                {status && <Alert severity="error">{status}</Alert>}
                {!target && <Muted sx={{ fontSize: 13.5 }}>Creates the folder inside {parentName}.</Muted>}
                <FormikTextField
                  name="name"
                  label={target ? "Name" : "Folder name"}
                  autoFocus
                  placeholder={!target ? "e.g. Permits" : undefined}
                  InputProps={ext ? { endAdornment: <Box sx={{ color: "text.secondary", pl: 1 }}>{ext}</Box> } : undefined}
                />
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={onClose}>Cancel</Button>
              <Button type="submit" variant="contained" color="primary" disabled={isSubmitting}>
                {target ? "Save" : "Create folder"}
              </Button>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </FormDrawer>
  );
}

/** Pick a destination folder from the whole tree. */
function MoveDrawer({ row, onClose, onMoved }: { row: Row; onClose: () => void; onMoved: (msg: string) => void }) {
  const [tree, setTree] = useState<FolderTreeNode[] | null>(null);
  const [dest, setDest] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const currentParent = row.type === "folder" ? row.folder.parent_id : row.file.folder_id;

  useEffect(() => {
    filesApi.tree().then(setTree).catch((e: Error) => setError(e.message));
  }, []);

  // A folder can't go into itself or anything under it.
  const blocked = useMemo(() => {
    const out = new Set<string>();
    if (row.type !== "folder" || !tree) return out;
    out.add(row.folder.id);
    for (let grew = true; grew; ) {
      grew = false;
      for (const f of tree) if (f.parent_id && out.has(f.parent_id) && !out.has(f.id)) (out.add(f.id), (grew = true));
    }
    return out;
  }, [row, tree]);

  const children = (parent: string | null) => (tree ?? []).filter((f) => f.parent_id === parent && !blocked.has(f.id));

  const renderLevel = (parent: string | null, depth: number): ReactNode =>
    children(parent).map((f) => (
      <Box key={f.id}>
        <TreeItem label={f.name} depth={depth} selected={dest === f.id} current={currentParent === f.id} onClick={() => setDest(f.id)} />
        {renderLevel(f.id, depth + 1)}
      </Box>
    ));

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      if (row.type === "folder") await filesApi.updateFolder(row.folder.id, { parent_id: dest ?? "" });
      else await filesApi.updateFile(row.file.id, { folder_id: dest ?? "" });
      const name = dest ? tree?.find((f) => f.id === dest)?.name : "Files";
      onMoved(`Moved to ${name}`);
    } catch (e) {
      const msgs: string[] = [];
      setError(applyApiError(e, (_, m) => msgs.push(m)) ?? msgs[0] ?? "Could not move");
      setBusy(false);
    }
  };

  return (
    <FormDrawer open onClose={onClose} width={440}>
      <DialogTitle>Move “{rowName(row)}”</DialogTitle>
      <DialogContent>
        <Stack gap={1.5}>
          {error && <Alert severity="error">{error}</Alert>}
          <Muted sx={{ fontSize: 13.5 }}>Choose where to move it.</Muted>
          {!tree ? (
            <LinearProgress />
          ) : (
            <Box sx={{ border: `1px solid ${tokens.border}`, borderRadius: "10px", p: 0.75 }}>
              <TreeItem label="Files" root depth={0} selected={dest === null} current={currentParent === null} onClick={() => setDest(null)} />
              {renderLevel(null, 1)}
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" color="primary" disabled={busy || !tree || dest === currentParent} onClick={submit}>
          Move here
        </Button>
      </DialogActions>
    </FormDrawer>
  );
}

function TreeItem({
  label,
  depth,
  selected,
  current,
  root,
  onClick,
}: {
  label: string;
  depth: number;
  selected: boolean;
  current: boolean;
  root?: boolean;
  onClick: () => void;
}) {
  return (
    <ButtonBase
      onClick={onClick}
      aria-pressed={selected}
      sx={{
        width: "100%",
        justifyContent: "flex-start",
        gap: 1,
        py: 0.75,
        pr: 1,
        pl: 1 + depth * 2,
        borderRadius: "6px",
        fontSize: 14,
        fontWeight: selected ? 600 : 400,
        bgcolor: selected ? tokens.brandSoft : "transparent",
        "&:hover": { bgcolor: selected ? tokens.brandSoft : tokens.surfaceMuted },
      }}
    >
      {root ? <HomeOutlined sx={{ fontSize: 18, color: "text.secondary" }} /> : <FolderIcon size={18} />}
      <Box component="span" sx={{ flex: 1, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {label}
      </Box>
      {current && <ListItemIcon sx={{ minWidth: 0 }}><Muted sx={{ fontSize: 12 }}>current</Muted></ListItemIcon>}
    </ButtonBase>
  );
}
