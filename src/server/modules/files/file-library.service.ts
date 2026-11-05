import "server-only";
import path from "node:path";
import { Op, QueryTypes, type Model, type Transaction } from "sequelize";
import { FileFolder, LibraryFile, StoredFile, User, sequelize } from "@server/core/db/models";
import { authorize, can } from "@server/core/authorization/policy";
import { recordAudit } from "@server/core/audit/audit.service";
import { Errors } from "@server/core/http/errors";
import { deleteStoredFile, readStoredFile, saveFile } from "@server/core/storage/local-storage";
import { checkUpload, INLINE_TYPES } from "@server/core/storage/upload-policy";
import type { TenantContext } from "@server/core/tenancy/context";
import {
  LIBRARY_FILE_MAX_BYTES,
  type FileBrowseResult,
  type FileKind,
  type FolderDto,
  type FolderRef,
  type FolderTreeNode,
  type LibraryFileDto,
} from "@shared/contracts/files";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_DEPTH = 10;

type FolderRow = { id: string; name: string; parentId: string | null };

/** Every folder in the org, keyed by id. Folder counts are small, so paths are resolved in memory. */
async function folderMap(ctx: TenantContext, transaction?: Transaction) {
  const rows = await FileFolder.findAll({
    where: { organizationId: ctx.organizationId },
    attributes: ["id", "name", "parentId"],
    raw: true,
    transaction,
  });
  return new Map((rows as unknown as FolderRow[]).map((r) => [r.id, r]));
}

function chain(map: Map<string, FolderRow>, id: string | null): FolderRef[] {
  const out: FolderRef[] = [];
  for (let cur = id ? map.get(id) : undefined; cur && out.length <= MAX_DEPTH * 2; cur = cur.parentId ? map.get(cur.parentId) : undefined)
    out.unshift({ id: cur.id, name: cur.name });
  return out;
}
const pathOf = (map: Map<string, FolderRow>, id: string | null) => ["Files", ...chain(map, id).map((f) => f.name)].join(" / ");

function descendants(map: Map<string, FolderRow>, rootId: string): string[] {
  const out = [rootId];
  for (let i = 0; i < out.length; i++) for (const f of map.values()) if (f.parentId === out[i]) out.push(f.id);
  return out;
}

async function requireFolder(ctx: TenantContext, id: string, transaction?: Transaction) {
  const folder = UUID.test(id) ? await FileFolder.findOne({ where: { id, organizationId: ctx.organizationId }, transaction }) : null;
  if (!folder) throw Errors.notFound("Folder");
  return folder;
}

const fileInclude = [
  {
    model: StoredFile,
    as: "file",
    attributes: ["id", "mimeType", "sizeBytes", "bucketKey"],
    include: [{ model: User, as: "uploadedBy", attributes: ["name"] }],
  },
];

async function requireFile(ctx: TenantContext, id: string) {
  const row = UUID.test(id) ? await LibraryFile.findOne({ where: { id, organizationId: ctx.organizationId }, include: fileInclude }) : null;
  if (!row) throw Errors.notFound("File");
  return row;
}

function toFileDto(row: Model, map: Map<string, FolderRow>): LibraryFileDto {
  const f = row.get("file") as Model;
  const by = f.get("uploadedBy") as Model | null;
  const mime = f.get("mimeType") as string;
  const folderId = (row.get("folderId") as string | null) ?? null;
  return {
    id: row.get("id") as string,
    name: row.get("name") as string,
    folder_id: folderId,
    mime_type: mime,
    size_bytes: Number(f.get("sizeBytes")),
    is_image: mime.startsWith("image/") && mime !== "image/heic",
    uploaded_by: (by?.get("name") as string | undefined) ?? null,
    created_at: (row.get("createdAt") as Date).toISOString(),
    path: pathOf(map, folderId),
  };
}

const kindWhere = (kind: FileKind) =>
  kind === "images"
    ? { mimeType: { [Op.like]: "image/%" } }
    : kind === "pdf"
      ? { mimeType: "application/pdf" }
      : kind === "documents"
        ? { mimeType: { [Op.notLike]: "image/%", [Op.ne]: "application/pdf" } }
        : {};

/** Folder names are unique (case-insensitive) within their parent. */
async function assertFolderNameFree(ctx: TenantContext, parentId: string | null, name: string, exceptId?: string) {
  const clash = await FileFolder.findOne({
    where: {
      organizationId: ctx.organizationId,
      parentId,
      name: { [Op.iLike]: name.replace(/[%_\\]/g, "\\$&") },
      ...(exceptId && { id: { [Op.ne]: exceptId } }),
    },
  });
  if (clash) throw Errors.validation({ name: ["A folder with this name already exists here."] });
}

/** "plan.pdf" → "plan (2).pdf" when the folder already has that name. */
async function freeFileName(ctx: TenantContext, folderId: string | null, wanted: string, exceptId?: string) {
  const taken = new Set(
    (
      await LibraryFile.findAll({
        where: { organizationId: ctx.organizationId, folderId, ...(exceptId && { id: { [Op.ne]: exceptId } }) },
        attributes: ["name"],
        raw: true,
      })
    ).map((r) => (r as unknown as { name: string }).name.toLowerCase()),
  );
  if (!taken.has(wanted.toLowerCase())) return wanted;
  const ext = path.extname(wanted);
  const base = wanted.slice(0, wanted.length - ext.length);
  for (let n = 2; ; n++) {
    const candidate = `${base} (${n})${ext}`;
    if (!taken.has(candidate.toLowerCase())) return candidate.slice(0, 255);
  }
}

/** Removes library rows, marks the stored files deleted, then clears them from disk. */
async function purgeFiles(rows: Model[], transaction: Transaction) {
  const keys: string[] = [];
  for (const row of rows) {
    const f = row.get("file") as Model;
    keys.push(f.get("bucketKey") as string);
    await row.destroy({ transaction });
    await StoredFile.update({ status: "deleted" }, { where: { id: f.get("id") }, transaction });
  }
  return keys;
}

export const fileLibraryService = {
  async browse(ctx: TenantContext, q: { folder_id: string | null; q?: string; kind: FileKind }): Promise<FileBrowseResult> {
    authorize(ctx, "file.read");
    const map = await folderMap(ctx);
    const current = q.folder_id ? map.get(q.folder_id) : null;
    if (q.folder_id && !current) throw Errors.notFound("Folder");
    const search = q.q?.trim();
    const like = search && { [Op.iLike]: `%${search.replace(/[%_\\]/g, "\\$&")}%` };

    // Folders: children of the current folder, or name matches anywhere when searching.
    const folderRows =
      q.kind === "all" || q.kind === "folders"
        ? await FileFolder.findAll({
            where: { organizationId: ctx.organizationId, ...(like ? { name: like } : { parentId: q.folder_id }) },
            include: [{ model: User, as: "createdBy", attributes: ["name"] }],
            order: [["name", "ASC"]],
          })
        : [];
    const ids = folderRows.map((f) => f.get("id") as string);
    // Raw SQL: Turbopack can load sequelize twice, so fn()/col() from our import may not be recognized.
    const counts = ids.length
      ? ((await sequelize.query(
          `SELECT parent_id AS id, COUNT(*) AS n, 'folder' AS t FROM file_folders WHERE parent_id IN (:ids) GROUP BY parent_id
           UNION ALL
           SELECT folder_id AS id, COUNT(*) AS n, 'file' AS t FROM library_files WHERE folder_id IN (:ids) GROUP BY folder_id`,
          { replacements: { ids }, type: QueryTypes.SELECT },
        )) as { id: string; n: string; t: string }[])
      : [];
    const subs = new Map(counts.filter((c) => c.t === "folder").map((c) => [c.id, Number(c.n)]));
    const filesIn = new Map(counts.filter((c) => c.t === "file").map((c) => [c.id, Number(c.n)]));

    const folders: FolderDto[] = folderRows.map((f) => {
      const id = f.get("id") as string;
      const parentId = (f.get("parentId") as string | null) ?? null;
      return {
        id,
        name: f.get("name") as string,
        parent_id: parentId,
        folder_count: subs.get(id) ?? 0,
        file_count: filesIn.get(id) ?? 0,
        created_by: ((f.get("createdBy") as Model | null)?.get("name") as string | undefined) ?? null,
        updated_at: (f.get("updatedAt") as Date).toISOString(),
        path: pathOf(map, parentId),
      };
    });

    const files =
      q.kind === "folders"
        ? []
        : await LibraryFile.findAll({
            where: { organizationId: ctx.organizationId, ...(like ? { name: like } : { folderId: q.folder_id }) },
            include: [{ ...fileInclude[0]!, where: kindWhere(q.kind) }],
            order: [["createdAt", "DESC"]],
            limit: 500,
          });

    const [usage] = (await sequelize.query(
      `SELECT COUNT(lf.id) AS files, COALESCE(SUM(f.size_bytes), 0) AS bytes
         FROM library_files lf JOIN files f ON f.id = lf.file_id
        WHERE lf.organization_id = :org`,
      { replacements: { org: ctx.organizationId }, type: QueryTypes.SELECT },
    )) as { files: string; bytes: string }[];

    return {
      folder: current ? { id: current.id, name: current.name } : null,
      breadcrumbs: chain(map, q.folder_id),
      folders,
      files: files.map((r) => toFileDto(r, map)),
      usage: { files: Number(usage?.files ?? 0), bytes: Number(usage?.bytes ?? 0) },
      can_write: can(ctx, "file.write"),
    };
  },

  async tree(ctx: TenantContext): Promise<FolderTreeNode[]> {
    authorize(ctx, "file.read");
    const map = await folderMap(ctx);
    return [...map.values()]
      .map((f) => ({ id: f.id, name: f.name, parent_id: f.parentId }))
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  async createFolder(ctx: TenantContext, input: { name: string; parent_id: string | null }): Promise<FolderRef> {
    authorize(ctx, "file.write");
    if (input.parent_id) {
      await requireFolder(ctx, input.parent_id);
      if (chain(await folderMap(ctx), input.parent_id).length >= MAX_DEPTH)
        throw Errors.validation({ name: [`Folders can be nested up to ${MAX_DEPTH} levels.`] });
    }
    await assertFolderNameFree(ctx, input.parent_id, input.name);
    const folder = await FileFolder.create({
      organizationId: ctx.organizationId,
      parentId: input.parent_id,
      name: input.name,
      createdByUserId: ctx.userId,
    });
    const dto = { id: folder.get("id") as string, name: input.name };
    await recordAudit(ctx, { action: "folder.created", entityType: "file_folder", entityId: dto.id, after: dto });
    return dto;
  },

  async updateFolder(ctx: TenantContext, id: string, input: { name?: string; parent_id?: string | null }): Promise<FolderRef> {
    authorize(ctx, "file.write");
    const folder = await requireFolder(ctx, id);
    const name = input.name ?? (folder.get("name") as string);
    const parentId = input.parent_id !== undefined ? input.parent_id : ((folder.get("parentId") as string | null) ?? null);
    if (parentId) {
      const map = await folderMap(ctx);
      if (!map.has(parentId)) throw Errors.notFound("Folder");
      if (descendants(map, id).includes(parentId)) throw Errors.validation({ parent_id: ["A folder can't be moved into itself."] });
      const below = Math.max(...descendants(map, id).map((d) => chain(map, d).length - chain(map, id).length + 1));
      if (chain(map, parentId).length + below > MAX_DEPTH)
        throw Errors.validation({ parent_id: [`Folders can be nested up to ${MAX_DEPTH} levels.`] });
    }
    await assertFolderNameFree(ctx, parentId, name, id);
    const before = { name: folder.get("name") as string, parent_id: folder.get("parentId") as string | null };
    await folder.update({ name, parentId });
    await recordAudit(ctx, { action: "folder.updated", entityType: "file_folder", entityId: id, before, after: { name, parent_id: parentId } });
    return { id, name };
  },

  /** Deletes the folder, everything nested in it, and their files. */
  async removeFolder(ctx: TenantContext, id: string): Promise<{ folders: number; files: number }> {
    authorize(ctx, "file.write");
    const folder = await requireFolder(ctx, id);
    const ids = descendants(await folderMap(ctx), id);
    const keys = await sequelize.transaction(async (transaction) => {
      const rows = await LibraryFile.findAll({ where: { organizationId: ctx.organizationId, folderId: ids }, include: fileInclude, transaction });
      const k = await purgeFiles(rows, transaction);
      await FileFolder.destroy({ where: { organizationId: ctx.organizationId, id: ids }, transaction });
      return k;
    });
    await Promise.all(keys.map((k) => deleteStoredFile(k).catch(() => undefined)));
    await recordAudit(ctx, {
      action: "folder.deleted",
      entityType: "file_folder",
      entityId: id,
      before: { name: folder.get("name") as string, folders: ids.length, files: keys.length },
    });
    return { folders: ids.length, files: keys.length };
  },

  async upload(ctx: TenantContext, folderId: string | null, file: File): Promise<LibraryFileDto> {
    authorize(ctx, "file.write");
    if (folderId) await requireFolder(ctx, folderId);
    const { buf, filename, ext, mimeType } = await checkUpload(file, LIBRARY_FILE_MAX_BYTES);
    const name = await freeFileName(ctx, folderId, filename);
    const { key, checksum } = await saveFile(ctx.organizationId, "library", buf, ext);
    const id = await sequelize.transaction(async (transaction) => {
      const stored = await StoredFile.create(
        {
          organizationId: ctx.organizationId,
          storageProvider: "local",
          bucketKey: key,
          originalFilename: filename,
          mimeType,
          sizeBytes: buf.length,
          checksumSha256: checksum,
          uploadedByUserId: ctx.userId,
          scanStatus: "not_required",
          status: "available",
        },
        { transaction },
      );
      const row = await LibraryFile.create(
        { organizationId: ctx.organizationId, folderId, fileId: stored.get("id"), name, createdByUserId: ctx.userId },
        { transaction },
      );
      return row.get("id") as string;
    });
    const dto = toFileDto(await requireFile(ctx, id), await folderMap(ctx));
    await recordAudit(ctx, { action: "file.uploaded", entityType: "library_file", entityId: id, after: { name, size_bytes: dto.size_bytes } });
    return dto;
  },

  async updateFile(ctx: TenantContext, id: string, input: { name?: string; folder_id?: string | null }): Promise<LibraryFileDto> {
    authorize(ctx, "file.write");
    const row = await requireFile(ctx, id);
    const folderId = input.folder_id !== undefined ? input.folder_id : ((row.get("folderId") as string | null) ?? null);
    if (folderId) await requireFolder(ctx, folderId);
    let name = input.name ?? (row.get("name") as string);
    // Keep the extension: it decides how the file is served.
    const ext = path.extname(row.get("name") as string);
    if (ext && path.extname(name).toLowerCase() !== ext.toLowerCase()) name = `${name}${ext}`;
    name = await freeFileName(ctx, folderId, name.slice(0, 255), id);
    const before = { name: row.get("name") as string, folder_id: row.get("folderId") as string | null };
    await row.update({ name, folderId });
    await recordAudit(ctx, { action: "file.updated", entityType: "library_file", entityId: id, before, after: { name, folder_id: folderId } });
    return toFileDto(await requireFile(ctx, id), await folderMap(ctx));
  },

  async download(ctx: TenantContext, id: string) {
    authorize(ctx, "file.read");
    const row = await requireFile(ctx, id);
    const f = row.get("file") as Model;
    const mimeType = f.get("mimeType") as string;
    return {
      body: await readStoredFile(f.get("bucketKey") as string),
      mimeType,
      filename: row.get("name") as string,
      inline: INLINE_TYPES.has(mimeType),
    };
  },

  async removeFile(ctx: TenantContext, id: string): Promise<void> {
    authorize(ctx, "file.write");
    const row = await requireFile(ctx, id);
    const name = row.get("name") as string;
    const keys = await sequelize.transaction((transaction) => purgeFiles([row], transaction));
    await Promise.all(keys.map((k) => deleteStoredFile(k).catch(() => undefined)));
    await recordAudit(ctx, { action: "file.deleted", entityType: "library_file", entityId: id, before: { name } });
  },
};
