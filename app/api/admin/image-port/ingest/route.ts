import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { rejectCrossSiteMutation } from "@/lib/admin-request-origin";
import {
  IMAGE_PORT_INPUT_MIME,
} from "@/lib/image-port/encode-webp";
import { storePortfolioWebpFromBuffer } from "@/lib/image-port/store-portfolio";
import { getClientIp, isRateLimitedAsync } from "@/lib/permissions/rate-limit";
import { assertValidSegmentForWrite } from "@/lib/t9-media-segments";
import { normalizeUploadContentType } from "@/lib/upload-mime";
import { normalizeT9MediaRoot } from "@/lib/t9-media-root";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Stay under Vercel’s ~4.5MB body limit (FormData overhead). */
const MAX_BYTES = 3.5 * 1024 * 1024;

function guessContentType(file: File): string {
  if (file.type) return file.type;
  if (/\.png$/i.test(file.name)) return "image/png";
  if (/\.webp$/i.test(file.name)) return "image/webp";
  if (/\.jpe?g$/i.test(file.name)) return "image/jpeg";
  return "";
}

/**
 * POST /api/admin/image-port/ingest
 * Same-origin FormData → Sharp WebP full+thumb (no browser PUT to R2).
 */
export async function POST(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const csrf = rejectCrossSiteMutation(req);
  if (csrf) return csrf;

  const ip = getClientIp(req);
  if (
    await isRateLimitedAsync(ip, {
      scope: "image-port-finalize",
      max: 30,
      windowMs: 60 * 60_000,
    })
  ) {
    return NextResponse.json({ ok: false, error: "Too many ingest requests." }, { status: 429 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Expected multipart form data." }, { status: 400 });
  }

  const pillarRaw = form.get("pillar")?.toString() ?? "";
  const root = normalizeT9MediaRoot(form.get("root"));
  try {
    assertValidSegmentForWrite(root, pillarRaw);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid segment.";
    const status =
      typeof err === "object" && err && "status" in err && typeof (err as { status: number }).status === "number"
        ? (err as { status: number }).status
        : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
  const segment = pillarRaw.toLowerCase().trim();

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "Missing file." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      {
        ok: false,
        error: "File is too large for one-shot ingest. Use the chunked upload path.",
        code: "too_large",
      },
      { status: 413 }
    );
  }

  const contentType = normalizeUploadContentType(guessContentType(file));
  if (!contentType || !IMAGE_PORT_INPUT_MIME.has(contentType)) {
    return NextResponse.json(
      { ok: false, error: "Upload JPEG, PNG, or WebP only." },
      { status: 400 }
    );
  }

  const source = Buffer.from(await file.arrayBuffer());
  try {
    const stored = await storePortfolioWebpFromBuffer(source, segment, undefined, root);
    return NextResponse.json({ ok: true, ...stored });
  } catch (err) {
    console.error("IMAGE_PORT_INGEST_ERROR", err);
    const status =
      typeof err === "object" && err && "status" in err && typeof (err as { status: number }).status === "number"
        ? (err as { status: number }).status
        : 500;
    const message = err instanceof Error ? err.message : "Ingest failed.";
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
