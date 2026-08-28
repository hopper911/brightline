import { ZipArchive } from "archiver";
import { PassThrough } from "node:stream";
import { Readable } from "node:stream";

import { getObjectReadable } from "@/lib/storage-r2";

export const MAX_ZIP_FILES = 300;

export type R2ZipEntry = { key: string; name: string };

/**
 * Stream a ZIP of R2 objects to the browser (same-origin server reads R2; avoids client CORS).
 * Caller must validate access; this only streams bytes.
 */
export function createR2KeysZipResponse(entries: R2ZipEntry[], zipFilename: string): Response {
  if (entries.length === 0) {
    throw new Error("ZIP requires at least one entry.");
  }
  if (entries.length > MAX_ZIP_FILES) {
    throw new Error(`Too many files for one ZIP (max ${MAX_ZIP_FILES}).`);
  }

  let baseName = zipFilename
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
  if (!baseName.toLowerCase().endsWith(".zip")) {
    baseName = `${baseName}.zip`;
  }

  const passThrough = new PassThrough();
  const archive = new ZipArchive({ zlib: { level: 6 } });
  archive.on("error", (err: Error) => {
    passThrough.destroy(err);
  });
  archive.pipe(passThrough);

  void (async () => {
    try {
      for (const { key, name } of entries) {
        const stream = await getObjectReadable(key);
        archive.append(stream, { name });
      }
      await archive.finalize();
    } catch (e) {
      passThrough.destroy(e instanceof Error ? e : new Error(String(e)));
    }
  })();

  const webStream = Readable.toWeb(passThrough) as unknown as BodyInit;
  return new Response(webStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${baseName}"`,
      "Cache-Control": "no-store",
    },
  });
}
