import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { SITE_BACKGROUNDS_PREFIX } from "@/lib/site-background-videos";
import { isAllowedImageOrVideoUpload } from "@/lib/upload-mime";
import {
  abortMultipartUpload,
  completeMultipartUpload,
  createMultipartUpload,
  deleteObject,
  getObjectBuffer,
  putObjectBuffer,
  uploadMultipartPart,
} from "@/lib/storage-r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Assembling large masters can take a while. */
export const maxDuration = 300;

/** R2/S3: every part except the last must be ≥ 5 MiB. */
const MIN_PART = 5 * 1024 * 1024;

function assertBackgroundKey(key: string) {
  const clean = key.replace(/^\/+/, "");
  if (!clean.startsWith(SITE_BACKGROUNDS_PREFIX) || clean.includes("..")) {
    throw Object.assign(new Error("Invalid storage key."), { status: 400 });
  }
  return clean;
}

function assertStagingPrefix(prefix: string) {
  const clean = prefix.replace(/^\/+/, "");
  const expected = `${SITE_BACKGROUNDS_PREFIX}.upload-parts/`;
  if (!clean.startsWith(expected) || clean.includes("..")) {
    throw Object.assign(new Error("Invalid staging prefix."), { status: 400 });
  }
  return clean.endsWith("/") ? clean : `${clean}/`;
}

async function deleteStagingParts(stagingPrefix: string, totalParts: number) {
  const prefix = assertStagingPrefix(stagingPrefix);
  await Promise.all(
    Array.from({ length: totalParts }, (_, i) => {
      const key = `${prefix}${String(i + 1).padStart(5, "0")}`;
      return deleteObject(key).catch(() => undefined);
    })
  );
}

/**
 * Assemble staged ≤3MB chunks into the final object.
 * Uses a single PutObject when total < 5MiB; otherwise R2 multipart with ≥5MiB parts.
 */
export async function POST(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  let body: {
    key?: string;
    stagingPrefix?: string;
    contentType?: string;
    totalParts?: number;
    abort?: boolean;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const totalParts = typeof body.totalParts === "number" ? Math.round(body.totalParts) : 0;
  if (!body.key || !body.stagingPrefix) {
    return NextResponse.json(
      { ok: false, error: "key and stagingPrefix are required." },
      { status: 400 }
    );
  }

  try {
    const key = assertBackgroundKey(body.key);
    const stagingPrefix = assertStagingPrefix(body.stagingPrefix);

    if (body.abort) {
      if (totalParts > 0) await deleteStagingParts(stagingPrefix, totalParts);
      return NextResponse.json({ ok: true, aborted: true });
    }

    if (totalParts < 1 || totalParts > 10_000) {
      return NextResponse.json({ ok: false, error: "totalParts is invalid." }, { status: 400 });
    }

    const contentType = isAllowedImageOrVideoUpload(body.contentType);
    if (!contentType) {
      return NextResponse.json({ ok: false, error: "Unsupported content type." }, { status: 400 });
    }
    const chunks: Buffer[] = [];
    let totalBytes = 0;
    for (let i = 1; i <= totalParts; i++) {
      const partKey = `${stagingPrefix}${String(i).padStart(5, "0")}`;
      const buf = await getObjectBuffer(partKey);
      chunks.push(buf);
      totalBytes += buf.length;
    }

    if (totalBytes < MIN_PART) {
      await putObjectBuffer({
        key,
        body: Buffer.concat(chunks),
        contentType,
        access: "private",
      });
      await deleteStagingParts(stagingPrefix, totalParts);
      return NextResponse.json({ ok: true, key, bytes: totalBytes, mode: "single" });
    }

    const started = await createMultipartUpload({ key, contentType });
    const uploaded: Array<{ etag: string; partNumber: number }> = [];
    let partNumber = 1;
    let buffer = Buffer.alloc(0);

    const emit = async (slice: Buffer) => {
      const part = await uploadMultipartPart({
        key,
        uploadId: started.uploadId,
        partNumber,
        body: slice,
      });
      uploaded.push(part);
      partNumber += 1;
    };

    try {
      for (let i = 0; i < chunks.length; i++) {
        buffer = Buffer.concat([buffer, chunks[i]!]);
        const isLast = i === chunks.length - 1;
        if (!isLast) {
          while (buffer.length >= MIN_PART) {
            await emit(Buffer.from(buffer.subarray(0, MIN_PART)));
            buffer = Buffer.from(buffer.subarray(MIN_PART));
          }
        } else {
          while (buffer.length > MIN_PART) {
            await emit(Buffer.from(buffer.subarray(0, MIN_PART)));
            buffer = Buffer.from(buffer.subarray(MIN_PART));
          }
          if (buffer.length > 0) {
            await emit(buffer);
            buffer = Buffer.alloc(0);
          }
        }
      }

      await completeMultipartUpload({
        key,
        uploadId: started.uploadId,
        parts: uploaded,
      });
    } catch (err) {
      await abortMultipartUpload({ key, uploadId: started.uploadId }).catch(() => undefined);
      throw err;
    }

    await deleteStagingParts(stagingPrefix, totalParts);
    return NextResponse.json({
      ok: true,
      key,
      bytes: totalBytes,
      mode: "multipart",
      parts: uploaded.length,
    });
  } catch (err) {
    const status =
      typeof err === "object" && err && "status" in err && typeof (err as { status: number }).status === "number"
        ? (err as { status: number }).status
        : 500;
    const message = err instanceof Error ? err.message : "Could not complete upload.";
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
