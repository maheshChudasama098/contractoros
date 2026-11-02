import "server-only";

/** Streams a stored file. Non-inline files download; filenames are RFC 5987 encoded. */
export function fileResponse(body: Buffer, mimeType: string, filename: string, inline: boolean) {
  const safe = filename.replace(/[^\w.\- ]+/g, "_");
  return new Response(new Uint8Array(body), {
    headers: {
      "content-type": mimeType,
      "content-disposition": `${inline ? "inline" : "attachment"}; filename="${safe}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "cache-control": "private, no-cache",
      "x-content-type-options": "nosniff",
      // Uploaded content never runs scripts. (Browsers' PDF viewers break under this CSP, and PDFs are byte-checked on upload.)
      ...(mimeType !== "application/pdf" && { "content-security-policy": "default-src 'none'; img-src 'self'; sandbox" }),
    },
  });
}
