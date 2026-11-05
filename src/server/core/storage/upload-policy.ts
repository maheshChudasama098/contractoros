import "server-only";
import path from "node:path";
import { Errors } from "@server/core/http/errors";
import { sniffImageType } from "./local-storage";

/** Allowed uploads by extension. The mime type we store/serve comes from here, never from the browser. */
export const ALLOWED_UPLOADS: Record<string, string> = {
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
/** Types the browser may render in place (everything else downloads). */
export const INLINE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "application/pdf"]);

/** Validates size, extension and magic bytes; returns what to store. */
export async function checkUpload(file: File, maxBytes: number) {
  if (file.size > maxBytes) throw Errors.validation({ file: [`Files must be ${Math.round(maxBytes / 1024 / 1024)} MB or smaller.`] });
  const filename = path.basename(file.name).slice(0, 255) || "file";
  const ext = path.extname(filename).slice(1).toLowerCase();
  let mimeType = ALLOWED_UPLOADS[ext];
  if (!mimeType) throw Errors.validation({ file: ["Upload a PDF, photo, Word, Excel, CSV, text or DWG file."] });
  const buf = Buffer.from(await file.arrayBuffer());
  // Bytes must agree with the extension for types we can sniff (blocks e.g. HTML renamed to .png).
  const sniffed = sniffImageType(buf);
  if ((INLINE_TYPES.has(mimeType) || sniffed) && sniffed !== mimeType) {
    if (!(sniffed && INLINE_TYPES.has(sniffed))) throw Errors.validation({ file: ["The file's contents don't match its extension."] });
    mimeType = sniffed;
  }
  return { buf, filename, ext, mimeType };
}
