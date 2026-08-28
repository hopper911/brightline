import { concatNodeBuffers, concatTwoBuffers, bufferFromSlice } from "@/lib/crypto-buffer";
import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { rejectCrossSiteMutation } from "@/lib/admin-request-origin";
import {
  IMAGE_PORT_INPUT_MIME,
  IMAGE_PORT_TEMP_PREFIX,
  isImagePortTempKey,
} from "@/lib/image-port/encode-webp";
import { normalizeUploadContentType } from "@/lib/upload-mime";
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
export const maxDuration = 300;

const MIN_PART = 5 * 1024 * 1024;
const PARTS_PREFIX = `${IMAGE_PORT_TEMP_PREFIX}.parts/`;

function assertTempKey(key: string): string {
  const clean = key.trim().replace(/^\/+/, "");
  if (!isImagePortTempKey(clean) || clean.startsWith(PARTS_PREFIX)) {
    throw Object.assign(new Error("Invalid tempKey."), { status: 400 });
  }
  return clean;
}

function assertStagingPrefix(prefix: string): string {
  const clean = prefix.trim().replace(/^\/+/, "");
  const withSlash = clean.endsWith("/") ? clean : `${clean}/`;
  if (!isImagePortTempKey(withSlash) || !withSlash.startsWith(PARTS_PREFIX)) {
    throw Object.assign(new Error("Invalid staging prefix."), { status: 400 });
  }
  return withSlash;
}

async function deleteStagingParts(stagingPrefix: string, totalParts: number) {
  await Promise.all(
    Array.from({ length: totalParts }, (_, i) => {
      const key = `${stagingPrefix}${String(i + 1).padStart(5, "0")}`;
      return deleteObject(key).catch(() => undefined);
    })
  );
}

/**
 * Assemble staged chunks into tmp/image-port/{pillar}/{id}.{ext} for finalize.
 */
export async function POST(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const csrf = rejectCrossSiteMutation(req);
  if (csrf) return csrf;

  let body: {
    tempKey?: string;
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
  if (!body.tempKey || !body.stagingPrefix) {
    return NextResponse.json(
      { ok: false, error: "tempKey and stagingPrefix are required." },
      { status: 400 }
    );
  }

  try {
    const tempKey = assertTempKey(body.tempKey);
    const stagingPrefix = assertStagingPrefix(body.stagingPrefix);

    if (body.abort) {
      if (totalParts > 0) await deleteStagingParts(stagingPrefix, totalParts);
      return NextResponse.json({ ok: true, aborted: true });
    }

    if (totalParts < 1 || totalParts > 10_000) {
      return NextResponse.json({ ok: false, error: "totalParts is invalid." }, { status: 400 });
    }

    const contentType = normalizeUploadContentType(body.contentType);
    if (!contentType || !IMAGE_PORT_INPUT_MIME.has(contentType)) {
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
        key: tempKey,
        body: concatNodeBuffers(chunks),
        contentType,
        access: "private",
      });
      await deleteStagingParts(stagingPrefix, totalParts);
      return NextResponse.json({ ok: true, tempKey, bytes: totalBytes, mode: "single" });
    }

    const started = await createMultipartUpload({ key: tempKey, contentType });
    const uploaded: Array<{ etag: string; partNumber: number }> = [];
    let partNumber = 1;
    let buffer = Buffer.alloc(0);

    const emit = async (slice: Buffer) => {
      const part = await uploadMultipartPart({
        key: tempKey,
        uploadId: started.uploadId,
        partNumber,
        body: slice,
      });
      uploaded.push(part);
      partNumber += 1;
    };

    try {
      for (let i = 0; i < chunks.length; i++) {
        buffer = concatTwoBuffers(buffer, chunks[i]!);
        const isLast = i === chunks.length - 1;
        if (!isLast) {
          while (buffer.length >= MIN_PART) {
            await emit(bufferFromSlice(buffer, 0, MIN_PART));
            buffer = bufferFromSlice(buffer, MIN_PART);
          }
        } else {
          while (buffer.length > MIN_PART) {
            await emit(bufferFromSlice(buffer, 0, MIN_PART));
            buffer = bufferFromSlice(buffer, MIN_PART);
          }
          if (buffer.length > 0) {
            await emit(buffer);
            buffer = Buffer.alloc(0);
          }
        }
      }

      await completeMultipartUpload({
        key: tempKey,
        uploadId: started.uploadId,
        parts: uploaded,
      });
    } catch (err) {
      await abortMultipartUpload({ key: tempKey, uploadId: started.uploadId }).catch(() => undefined);
      throw err;
    }

    await deleteStagingParts(stagingPrefix, totalParts);
    return NextResponse.json({
      ok: true,
      tempKey,
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
