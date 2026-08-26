import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { rejectCrossSiteMutation } from "@/lib/admin-request-origin";
import { compactDestKeys, putCompactWebpPair } from "@/lib/admin-r2-compact";
import {
  assertR2ManagerKeyAllowed,
  detectR2Kind,
  fileNameFromKey,
  isR2ManagerKeyAllowed,
  normalizePrefix,
} from "@/lib/admin-r2-manager";
import {
  IMAGE_PORT_INPUT_MIME,
  isImagePortTempKey,
} from "@/lib/image-port/encode-webp";
import { isPublicMediaKey } from "@/lib/media-key-access";
import { getClientIp, isRateLimitedAsync } from "@/lib/permissions/rate-limit";
import { deleteObject, getObjectBuffer, putObjectBuffer } from "@/lib/storage-r2";
import { normalizeUploadContentType } from "@/lib/upload-mime";
import { normalizeR2VaultId } from "@/lib/r2-vaults";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BYTES = 3.5 * 1024 * 1024;
const MAX_VIDEO_BYTES = 15 * 1024 * 1024;

function guessContentType(file: File): string {
  if (file.type) return file.type;
  if (/\.png$/i.test(file.name)) return "image/png";
  if (/\.webp$/i.test(file.name)) return "image/webp";
  if (/\.jpe?g$/i.test(file.name)) return "image/jpeg";
  if (/\.mp4$/i.test(file.name)) return "video/mp4";
  if (/\.webm$/i.test(file.name)) return "video/webm";
  if (/\.mov$/i.test(file.name)) return "video/quicktime";
  return "";
}

/**
 * Same-origin compact ingest into an allowlisted prefix.
 * Images → WebP full+thumb. Small videos pass through. No browser PUT to R2.
 */
export async function POST(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const csrf = rejectCrossSiteMutation(req);
  if (csrf) return csrf;
  if (
    await isRateLimitedAsync(getClientIp(req), {
      scope: "r2-compact-upload",
      max: 40,
      windowMs: 60 * 60_000,
    })
  ) {
    return NextResponse.json({ ok: false, error: "Too many compact uploads." }, { status: 429 });
  }

  const contentTypeHeader = req.headers.get("content-type") || "";
  let prefix = "";
  let fileName = "";
  let source: Buffer | null = null;
  let mime = "";
  let tempKeyToDelete: string | null = null;

  try {
    if (contentTypeHeader.includes("application/json")) {
      const body = (await req.json()) as {
        prefix?: string;
        tempKey?: string;
        fileName?: string;
        vault?: string;
      };
      if (normalizeR2VaultId(body.vault) === "mirotech-site") {
        return NextResponse.json(
          { ok: false, error: "Compact-to-WebP is only available on the Brightline vault." },
          { status: 400 }
        );
      }
      prefix = normalizePrefix(assertR2ManagerKeyAllowed(body.prefix ?? ""));
      const tempKey = typeof body.tempKey === "string" ? body.tempKey.trim().replace(/^\/+/, "") : "";
      if (!tempKey || !isImagePortTempKey(tempKey)) {
        return NextResponse.json({ ok: false, error: "Invalid tempKey." }, { status: 400 });
      }
      fileName = body.fileName?.trim() || fileNameFromKey(tempKey);
      source = await getObjectBuffer(tempKey);
      tempKeyToDelete = tempKey;
      mime = /\.png$/i.test(fileName)
        ? "image/png"
        : /\.webp$/i.test(fileName)
          ? "image/webp"
          : "image/jpeg";
    } else {
      const form = await req.formData();
      if (normalizeR2VaultId(form.get("vault")) === "mirotech-site") {
        return NextResponse.json(
          { ok: false, error: "Compact-to-WebP is only available on the Brightline vault." },
          { status: 400 }
        );
      }
      prefix = normalizePrefix(assertR2ManagerKeyAllowed(String(form.get("prefix") ?? "")));
      const file = form.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ ok: false, error: "Missing file." }, { status: 400 });
      }
      fileName = file.name;
      mime = normalizeUploadContentType(guessContentType(file)) || "";
      if (file.size > MAX_BYTES) {
        return NextResponse.json(
          {
            ok: false,
            error: "File is too large for one-shot upload. Use chunked compact upload.",
            code: "too_large",
          },
          { status: 413 }
        );
      }
      source = Buffer.from(await file.arrayBuffer());
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid upload.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }

  if (!source) {
    return NextResponse.json({ ok: false, error: "Missing file bytes." }, { status: 400 });
  }

  const kind = detectR2Kind(fileName);
  try {
    if (kind === "video") {
      if (source.length > MAX_VIDEO_BYTES) {
        return NextResponse.json(
          { ok: false, error: "Videos over 15MB are not allowed in R2 manager. Encode smaller first." },
          { status: 413 }
        );
      }
      const dest = `${prefix}${fileNameFromKey(fileName).replace(/[/\\?%*:|"<>]/g, "-")}`;
      assertR2ManagerKeyAllowed(dest);
      await putObjectBuffer({
        key: dest,
        body: source,
        contentType: mime || "video/mp4",
        access: isPublicMediaKey(dest) ? "public-read" : "private",
      });
      if (tempKeyToDelete) await deleteObject(tempKeyToDelete).catch(() => undefined);
      return NextResponse.json({ ok: true, key: dest, kind: "video" });
    }

    const normalized = normalizeUploadContentType(mime);
    if (!normalized || !IMAGE_PORT_INPUT_MIME.has(normalized)) {
      return NextResponse.json(
        { ok: false, error: "Upload JPEG, PNG, or WebP only (compacted to WebP)." },
        { status: 400 }
      );
    }

    const dest = compactDestKeys(prefix, fileName);
    if (!isR2ManagerKeyAllowed(dest.fullKey) || !isR2ManagerKeyAllowed(dest.thumbKey)) {
      return NextResponse.json({ ok: false, error: "Destination key not allowed." }, { status: 400 });
    }
    const stored = await putCompactWebpPair(source, dest.fullKey, dest.thumbKey);
    if (tempKeyToDelete) await deleteObject(tempKeyToDelete).catch(() => undefined);
    return NextResponse.json({ ok: true, kind: "image", ...stored });
  } catch (err) {
    console.error("R2_COMPACT_UPLOAD_ERROR", err);
    if (tempKeyToDelete) await deleteObject(tempKeyToDelete).catch(() => undefined);
    const status =
      typeof err === "object" && err && "status" in err && typeof (err as { status: number }).status === "number"
        ? (err as { status: number }).status
        : 500;
    const message = err instanceof Error ? err.message : "Compact upload failed.";
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
