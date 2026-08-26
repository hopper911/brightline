import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { assertSameOriginAdminMutation } from "@/lib/admin-request-origin";
import { assertR2ManagerKeyAllowed } from "@/lib/admin-r2-manager";
import {
  assertR2UploadStagingPrefix,
  R2_MULTIPART_MIN_PART,
} from "@/lib/admin-r2-multipart";
import { isPrivateMediaKey } from "@/lib/media-key-access";
import { normalizeR2VaultId } from "@/lib/r2-vaults";
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

async function deleteStagingParts(
  stagingPrefix: string,
  totalParts: number,
  vault: ReturnType<typeof normalizeR2VaultId>
) {
  const prefix = assertR2UploadStagingPrefix(stagingPrefix, vault);
  await Promise.all(
    Array.from({ length: totalParts }, (_, i) => {
      const key = `${prefix}${String(i + 1).padStart(5, "0")}`;
      return deleteObject(key, vault).catch(() => undefined);
    })
  );
}

/**
 * Assemble staged chunks into the final object in the target vault.
 */
export async function POST(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const originDenied = assertSameOriginAdminMutation(req);
  if (originDenied) return originDenied;

  let body: {
    key?: string;
    stagingPrefix?: string;
    contentType?: string;
    totalParts?: number;
    vault?: string;
    abort?: boolean;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const vault = normalizeR2VaultId(body.vault);
  const totalParts = typeof body.totalParts === "number" ? Math.round(body.totalParts) : 0;
  if (!body.key || !body.stagingPrefix) {
    return NextResponse.json(
      { ok: false, error: "key and stagingPrefix are required." },
      { status: 400 }
    );
  }

  try {
    const key = assertR2ManagerKeyAllowed(body.key, vault);
    const stagingPrefix = assertR2UploadStagingPrefix(body.stagingPrefix, vault);

    if (body.abort) {
      if (totalParts > 0) await deleteStagingParts(stagingPrefix, totalParts, vault);
      return NextResponse.json({ ok: true, aborted: true, vault });
    }

    if (totalParts < 1 || totalParts > 10_000) {
      return NextResponse.json({ ok: false, error: "totalParts is invalid." }, { status: 400 });
    }

    const contentType = normalizeUploadContentType(body.contentType);
    if (!contentType) {
      return NextResponse.json({ ok: false, error: "Unsupported content type." }, { status: 400 });
    }
    const chunks: Buffer[] = [];
    let totalBytes = 0;
    for (let i = 1; i <= totalParts; i++) {
      const partKey = `${stagingPrefix}${String(i).padStart(5, "0")}`;
      const buf = await getObjectBuffer(partKey, vault);
      chunks.push(buf);
      totalBytes += buf.length;
    }

    const access =
      vault === "brightline" && isPrivateMediaKey(key) ? "private" : "public-read";

    if (totalBytes < R2_MULTIPART_MIN_PART) {
      await putObjectBuffer({
        key,
        body: Buffer.concat(chunks),
        contentType,
        access,
        vault,
      });
      await deleteStagingParts(stagingPrefix, totalParts, vault);
      return NextResponse.json({ ok: true, key, bytes: totalBytes, mode: "single", vault });
    }

    const started = await createMultipartUpload({ key, contentType, vault });
    const uploaded: Array<{ etag: string; partNumber: number }> = [];
    let partNumber = 1;
    let buffer = Buffer.alloc(0);

    const emit = async (slice: Buffer) => {
      const part = await uploadMultipartPart({
        key,
        uploadId: started.uploadId,
        partNumber,
        body: slice,
        vault,
      });
      uploaded.push(part);
      partNumber += 1;
    };

    try {
      for (let i = 0; i < chunks.length; i++) {
        buffer = Buffer.concat([buffer, chunks[i]!]);
        const isLast = i === chunks.length - 1;
        if (!isLast) {
          while (buffer.length >= R2_MULTIPART_MIN_PART) {
            await emit(Buffer.from(buffer.subarray(0, R2_MULTIPART_MIN_PART)));
            buffer = Buffer.from(buffer.subarray(R2_MULTIPART_MIN_PART));
          }
        } else {
          while (buffer.length > R2_MULTIPART_MIN_PART) {
            await emit(Buffer.from(buffer.subarray(0, R2_MULTIPART_MIN_PART)));
            buffer = Buffer.from(buffer.subarray(R2_MULTIPART_MIN_PART));
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
        vault,
      });
    } catch (err) {
      await abortMultipartUpload({ key, uploadId: started.uploadId, vault }).catch(() => undefined);
      throw err;
    }

    await deleteStagingParts(stagingPrefix, totalParts, vault);
    return NextResponse.json({
      ok: true,
      key,
      bytes: totalBytes,
      mode: "multipart",
      parts: uploaded.length,
      vault,
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
