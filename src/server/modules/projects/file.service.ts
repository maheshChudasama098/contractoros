import "server-only";
import path from "node:path";
import type { Model } from "sequelize";
import { DocumentLink, StoredFile, User, sequelize } from "@server/core/db/models";
import { Errors } from "@server/core/http/errors";
import { deleteStoredFile, readStoredFile, saveFile, sniffImageType } from "@server/core/storage/local-storage";
import type { TenantContext } from "@server/core/tenancy/context";
import { PROJECT_FILE_MAX_BYTES, type ProjectFileDto } from "@shared/contracts/project-detail";
import { projectAudit, requireProject, UUID } from "./project-scope";

/** Allowed uploads by extension. The mime type we store/serve comes from here, never from the browser. */
const ALLOWED: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  heic: "image/heic",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv",
  txt: "text/plain",
  dwg: "application/acad",
};
const INLINE = new Set(["image/png", "image/jpeg", "image/webp", "application/pdf"]);

const include = [
  {
    model: StoredFile,
    as: "file",
    attributes: ["id", "originalFilename", "mimeType", "sizeBytes", "bucketKey"],
    include: [{ model: User, as: "uploadedBy", attributes: ["name"] }],
  },
];

function toDto(link: Model): ProjectFileDto {
  const f = link.get("file") as Model;
  const by = f.get("uploadedBy") as Model | null;
  const mime = f.get("mimeType") as string;
  return {
    id: link.get("id") as string,
    file_id: f.get("id") as string,
    filename: f.get("originalFilename") as string,
    mime_type: mime,
    size_bytes: Number(f.get("sizeBytes")),
    is_image: mime.startsWith("image/") && mime !== "image/heic",
    uploaded_by: (by?.get("name") as string | undefined) ?? null,
    created_at: (link.get("createdAt") as Date).toISOString(),
  };
}

async function findLink(ctx: TenantContext, projectId: string, id: string) {
  const link = UUID.test(id)
    ? await DocumentLink.findOne({
        where: { id, organizationId: ctx.organizationId, entityType: "project", entityId: projectId },
        include,
      })
    : null;
  if (!link) throw Errors.notFound("File");
  return link;
}

export const projectFileService = {
  async list(ctx: TenantContext, projectId: string): Promise<ProjectFileDto[]> {
    await requireProject(ctx, projectId);
    const rows = await DocumentLink.findAll({
      where: { organizationId: ctx.organizationId, entityType: "project", entityId: projectId },
      include,
      order: [["createdAt", "DESC"]],
    });
    return rows.map(toDto);
  },

  async upload(ctx: TenantContext, projectId: string, file: File): Promise<ProjectFileDto> {
    await requireProject(ctx, projectId, "project.write");
    if (file.size > PROJECT_FILE_MAX_BYTES) throw Errors.validation({ file: ["Files must be 20 MB or smaller."] });
    const filename = path.basename(file.name).slice(0, 255) || "file";
    const ext = path.extname(filename).slice(1).toLowerCase();
    let mimeType = ALLOWED[ext];
    if (!mimeType) throw Errors.validation({ file: ["Upload a PDF, photo, Word, Excel, CSV, text or DWG file."] });
    const buf = Buffer.from(await file.arrayBuffer());
    // Bytes must agree with the extension for types we can sniff (blocks e.g. HTML renamed to .png).
    const sniffed = sniffImageType(buf);
    if ((INLINE.has(mimeType) || sniffed) && sniffed !== mimeType) {
      if (!(sniffed && INLINE.has(sniffed))) throw Errors.validation({ file: ["The file's contents don't match its extension."] });
      mimeType = sniffed;
    }
    const { key, checksum } = await saveFile(ctx.organizationId, `projects/${projectId}`, buf, ext);
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
      const link = await DocumentLink.create(
        {
          organizationId: ctx.organizationId,
          fileId: stored.get("id"),
          entityType: "project",
          entityId: projectId,
          documentType: mimeType.startsWith("image/") ? "progress_photo" : "other",
          visibility: "internal",
        },
        { transaction },
      );
      return link.get("id") as string;
    });
    const dto = toDto(await findLink(ctx, projectId, id));
    await projectAudit(ctx, projectId, "file.uploaded", { after: { filename: dto.filename, size_bytes: dto.size_bytes } });
    return dto;
  },

  async download(ctx: TenantContext, projectId: string, id: string) {
    await requireProject(ctx, projectId);
    const f = (await findLink(ctx, projectId, id)).get("file") as Model;
    const mimeType = f.get("mimeType") as string;
    return {
      body: await readStoredFile(f.get("bucketKey") as string),
      mimeType,
      filename: f.get("originalFilename") as string,
      inline: INLINE.has(mimeType),
    };
  },

  async remove(ctx: TenantContext, projectId: string, id: string): Promise<void> {
    await requireProject(ctx, projectId, "project.write");
    const link = await findLink(ctx, projectId, id);
    const f = link.get("file") as Model;
    const filename = f.get("originalFilename") as string;
    const key = f.get("bucketKey") as string;
    await sequelize.transaction(async (transaction) => {
      await link.destroy({ transaction });
      await StoredFile.update({ status: "deleted" }, { where: { id: f.get("id") }, transaction });
    });
    await deleteStoredFile(key);
    await projectAudit(ctx, projectId, "file.deleted", { before: { filename } });
  },
};
