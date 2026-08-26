import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { rejectCrossSiteMutation } from "@/lib/admin-request-origin";
import {
  IMAGE_PORT_INPUT_MIME,
  IMAGE_PORT_TEMP_PREFIX,
  extForContentType,
} from "@/lib/image-port/encode-webp";
import { getClientIp, isRateLimitedAsync } from "@/lib/permissions/rate-limit";
import { assertValidSegmentForWrite } from "@/lib/t9-media-segments";
import { normalizeT9MediaRoot } from "@/lib/t9-media-root";
import { signPut } from "@/lib/storage-r2";
import { normalizeUploadContentType } from "@/lib/upload-mime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/image-port/upload-url
 * Signed PUT into tmp/image-port/ for later finalize → WebP portfolio keys.
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
      scope: "image-port-upload-url",
      max: 60,
      windowMs: 60 * 60_000,
    })
  ) {
    return NextResponse.json({ ok: false, error: "Too many upload requests." }, { status: 429 });
  }

  let body: { fileName?: string; contentType?: string; pillar?: string; root?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const root = normalizeT9MediaRoot(body.root);
  try {
    assertValidSegmentForWrite(root, body.pillar);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid segment.";
    const status =
      typeof err === "object" && err && "status" in err && typeof (err as { status: number }).status === "number"
        ? (err as { status: number }).status
        : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
  const segment = body.pillar!.toLowerCase().trim();

  const contentType = normalizeUploadContentType(body.contentType);
  if (!contentType || !IMAGE_PORT_INPUT_MIME.has(contentType)) {
    return NextResponse.json(
      { ok: false, error: "Upload JPEG, PNG, or WebP only." },
      { status: 400 }
    );
  }

  const id = randomBytes(12).toString("hex");
  const ext = extForContentType(contentType);
  const tempKey = `${IMAGE_PORT_TEMP_PREFIX}${segment}/${id}.${ext}`;

  try {
    const signed = await signPut({
      key: tempKey,
      contentType,
      access: "private",
      expiresIn: 900,
    });
    return NextResponse.json({
      ok: true,
      tempKey,
      pillar: segment,
      root,
      uploadUrl: signed.url,
      headers: signed.headers,
      expiresIn: signed.expiresIn,
      contentType,
    });
  } catch (err) {
    console.error("IMAGE_PORT_UPLOAD_URL_ERROR", err);
    return NextResponse.json({ ok: false, error: "Could not sign upload." }, { status: 502 });
  }
}
