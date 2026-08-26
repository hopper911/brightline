import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { rejectCrossSiteMutation } from "@/lib/admin-request-origin";
import { getClientIp, isRateLimitedAsync } from "@/lib/permissions/rate-limit";
import { putObjectBuffer } from "@/lib/storage-r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_POSTER_BYTES = 3.5 * 1024 * 1024;
import { isVideoPortPosterKey } from "@/lib/video-port/keys";
/**
 * One-shot PUT for an already-encoded poster still (WebP or PNG).
 * Never accepts a video original.
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
      scope: "video-port-poster",
      max: 60,
      windowMs: 60 * 60_000,
    })
  ) {
    return NextResponse.json({ ok: false, error: "Too many poster uploads." }, { status: 429 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Expected multipart form data." }, { status: 400 });
  }

  const posterKeyRaw = form.get("posterKey")?.toString() ?? "";
  const file = form.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ ok: false, error: "Missing poster file." }, { status: 400 });
  }
  if (file.size > MAX_POSTER_BYTES) {
    return NextResponse.json({ ok: false, error: "Poster too large." }, { status: 413 });
  }

  try {
    const clean = posterKeyRaw.trim().replace(/^\/+/, "");
    if (!isVideoPortPosterKey(clean)) {
      throw Object.assign(new Error("Invalid posterKey."), { status: 400 });
    }
    const posterKey = clean;
    const type = (file.type || "").toLowerCase();
    const contentType =
      type === "image/png" || posterKey.endsWith(".png") ? "image/png" : "image/webp";
    const body = Buffer.from(await file.arrayBuffer());
    await putObjectBuffer({
      key: posterKey,
      body,
      contentType,
      access: "public-read",
    });
    return NextResponse.json({
      ok: true,
      posterKey,
      previewUrl: `/api/media/public?key=${encodeURIComponent(posterKey)}`,
      bytes: body.length,
    });
  } catch (err) {
    const status =
      typeof err === "object" &&
      err &&
      "status" in err &&
      typeof (err as { status: number }).status === "number"
        ? (err as { status: number }).status
        : 500;
    const message = err instanceof Error ? err.message : "Poster upload failed.";
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
