import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

// Local-disk storage until the S3 integration exists. Keys are relative to STORAGE_ROOT.
const STORAGE_ROOT = path.join(process.cwd(), "storage", "uploads");

export const IMAGE_EXT: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

/** Detects the real image type from magic bytes; never trust the client-sent mime type. */
export function sniffImageType(buf: Buffer): string | null {
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  if (buf.subarray(0, 5).toString("ascii") === "%PDF-") return "application/pdf";
  return null;
}

/** Saves bytes under <org>/<folder>/<uuid>.<ext>; the original filename never touches the disk path. */
export async function saveFile(organizationId: string, folder: string, buf: Buffer, ext: string) {
  const safeExt = ext.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 10) || "bin";
  const key = `${organizationId}/${folder}/${randomUUID()}.${safeExt}`;
  const full = path.join(STORAGE_ROOT, key);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, buf);
  return { key, checksum: createHash("sha256").update(buf).digest("hex") };
}

function resolveKey(key: string) {
  const full = path.resolve(STORAGE_ROOT, key);
  if (!full.startsWith(STORAGE_ROOT + path.sep)) throw new Error("Invalid storage key");
  return full;
}

export const readStoredFile = (key: string) => readFile(resolveKey(key));

export async function deleteStoredFile(key: string) {
  await unlink(resolveKey(key)).catch(() => {}); // already gone is fine
}
