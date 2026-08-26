import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { rejectCrossSiteMutation } from "@/lib/admin-request-origin";
import { isImagePortTempKey } from "@/lib/image-port/encode-webp";
import { storePortfolioWebpFromBuffer } from "@/lib/image-port/store-portfolio";
import { getClientIp, isRateLimitedAsync } from "@/lib/permissions/rate-limit";
import { assertValidSegmentForWrite } from "@/lib/t9-media-segments";
import { deleteObject, getObjectBuffer } from "@/lib/storage-r2";
import { normalizeT9MediaRoot } from "@/lib/t9-media-root";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/admin/image-port/finalize
 * Convert temp upload → portfolio WebP full + thumb; delete temp (no JPEG kept).
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
    return NextResponse.json({ ok: false, error: "Too many finalize requests." }, { status: 429 });
  }

  let body: { tempKey?: string; pillar?: string; root?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const tempKey = typeof body.tempKey === "string" ? body.tempKey.trim().replace(/^\/+/, "") : "";
  if (!tempKey || !isImagePortTempKey(tempKey)) {
    return NextResponse.json({ ok: false, error: "Invalid tempKey." }, { status: 400 });
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

  let source: Buffer;
  try {
    source = await getObjectBuffer(tempKey);
  } catch (err) {
    console.error("IMAGE_PORT_GET_TEMP_ERROR", err);
    return NextResponse.json({ ok: false, error: "Temp upload not found." }, { status: 404 });
  }

  try {
    const stored = await storePortfolioWebpFromBuffer(source, segment, tempKey, root);
    try {
      await deleteObject(tempKey);
    } catch (err) {
      console.error("IMAGE_PORT_DELETE_TEMP_ERROR", err);
    }
    return NextResponse.json({ ok: true, ...stored });
  } catch (err) {
    console.error("IMAGE_PORT_FINALIZE_ERROR", err);
    const status =
      typeof err === "object" && err && "status" in err && typeof (err as { status: number }).status === "number"
        ? (err as { status: number }).status
        : 500;
    const message = err instanceof Error ? err.message : "Finalize failed.";
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
