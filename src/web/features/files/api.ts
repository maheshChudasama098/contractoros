import { ApiClientError, api } from "@web/lib/api-client";
import type { ApiError } from "@shared/contracts/api";
import type {
  FileBrowseQuery,
  FileBrowseResult,
  FolderInput,
  FolderPatch,
  FolderRef,
  FolderTreeNode,
  LibraryFileDto,
  LibraryFilePatch,
} from "@shared/contracts/files";

const send = <T>(method: string, path: string, body?: unknown) =>
  api<T>(path, { method, ...(body !== undefined && { body: JSON.stringify(body) }) });

export const filesApi = {
  browse: (q: FileBrowseQuery) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(q)) if (v) p.set(k, String(v));
    return api<FileBrowseResult>(`/files?${p}`);
  },
  tree: () => api<FolderTreeNode[]>("/files/folders"),
  createFolder: (input: FolderInput) => send<FolderRef>("POST", "/files/folders", input),
  updateFolder: (id: string, input: FolderPatch) => send<FolderRef>("PATCH", `/files/folders/${id}`, input),
  removeFolder: (id: string) => send<{ folders: number; files: number }>("DELETE", `/files/folders/${id}`),
  updateFile: (id: string, input: LibraryFilePatch) => send<LibraryFileDto>("PATCH", `/files/${id}`, input),
  removeFile: (id: string) => send<{ deleted: true }>("DELETE", `/files/${id}`),
  fileUrl: (id: string, download = false) => `/api/v1/files/${id}${download ? "?download=1" : ""}`,

  // Multipart: the browser sets the boundary, so skip api()'s JSON content-type.
  async upload(file: File, folderId: string | null) {
    const body = new FormData();
    body.append("file", file);
    if (folderId) body.append("folder_id", folderId);
    const res = await fetch("/api/v1/files", { method: "POST", body, credentials: "same-origin" });
    if (!res.ok) throw new ApiClientError(res.status, ((await res.json()) as ApiError).error);
  },
};
