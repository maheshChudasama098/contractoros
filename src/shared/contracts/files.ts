import { z } from "zod";

// Company file library (/api/v1/files): nested folders + uploaded files.

export const LIBRARY_FILE_MAX_BYTES = 25 * 1024 * 1024;
export const LIBRARY_ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp,.heic,.doc,.docx,.xls,.xlsx,.csv,.txt,.dwg";

const id = z.string().uuid();
const nullableId = id.or(z.literal("")).nullish().transform((v) => v || null);
const name = (max: number, what: string) =>
  z
    .string()
    .trim()
    .min(1, `${what} name is required.`)
    .max(max)
    .refine((v) => !/[\\/]/.test(v), "Names can't contain / or \\.");

export const FILE_KINDS = ["all", "folders", "images", "pdf", "documents"] as const;
export type FileKind = (typeof FILE_KINDS)[number];

export const FileBrowseQuery = z.object({
  folder_id: nullableId,
  /** Searches the whole library (every folder) when set. */
  q: z.string().trim().max(100).optional(),
  kind: z.enum(FILE_KINDS).default("all"),
});
export type FileBrowseQuery = z.input<typeof FileBrowseQuery>;

export const FolderInput = z.object({ name: name(120, "Folder"), parent_id: nullableId });
export type FolderInput = z.input<typeof FolderInput>;

export const FolderPatch = z
  .object({ name: name(120, "Folder").optional(), parent_id: nullableId.optional() })
  .refine((v) => v.name !== undefined || v.parent_id !== undefined, "Nothing to change.");
export type FolderPatch = z.input<typeof FolderPatch>;

export const LibraryFilePatch = z
  .object({ name: name(255, "File").optional(), folder_id: nullableId.optional() })
  .refine((v) => v.name !== undefined || v.folder_id !== undefined, "Nothing to change.");
export type LibraryFilePatch = z.input<typeof LibraryFilePatch>;

export type FolderRef = { id: string; name: string };

export type FolderDto = FolderRef & {
  parent_id: string | null;
  folder_count: number;
  file_count: number;
  created_by: string | null;
  updated_at: string;
  /** Location, shown in search results ("Plans / 2026"). */
  path: string;
};

export type LibraryFileDto = {
  id: string;
  name: string;
  folder_id: string | null;
  mime_type: string;
  size_bytes: number;
  is_image: boolean;
  uploaded_by: string | null;
  created_at: string;
  path: string;
};

export type FileBrowseResult = {
  folder: FolderRef | null;
  breadcrumbs: FolderRef[];
  folders: FolderDto[];
  files: LibraryFileDto[];
  usage: { files: number; bytes: number };
  can_write: boolean;
};

/** Flat list for the "move to" picker. */
export type FolderTreeNode = FolderRef & { parent_id: string | null };
