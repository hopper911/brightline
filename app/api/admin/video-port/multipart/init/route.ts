import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { rejectCrossSiteMutation } from "@/lib/admin-request-origin";
import { getClientIp, isRateLimitedAsync } from "@/lib/permissions/rate-limit";
import { listObjects } from "@/lib/storage-r2";
import {
  VIDEO_PORT_TEMP_PREFIX,
  formatVideoStem,
  isVideoPortPosterKey,
  maxVideoSeqFromKeys,
  videoPortKeysForStem,
  yyMmDdUtc,
} from "@/lib/video-port/keys";
import { assertValidSegmentForWrite } from "@/lib/t9-media-segments";
import { normalizeT9MediaRoot } from "@/lib/t9-media-root";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Allocate final {portfolio|mirotech} web_video keys + staging prefix for encoded-only upload.
 * Originals are never accepted — client encodes first.
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
      scope: "video-port-upload",
      max: 40,
      windowMs: 60 * 60_000,
    })
  ) {
    return NextResponse.json({ ok: false, error: "Too many upload requests." }, { status: 429 });
  }

  let body: { pillar?: string; bytes?: number; withPoster?: boolean; root?: string };
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
  const yymmdd = yyMmDdUtc();
  const prefix = `${root}/${segment}/web_video/`;

  let existing: string[] = [];
  try {
    existing = await listObjects({ prefix, maxKeys: 1000 });
  } catch (err) {
    console.error("VIDEO_PORT_LIST_ERROR", err);
  }

  const nextSeq = maxVideoSeqFromKeys(existing, segment, yymmdd, root) + 1;
  const stem = formatVideoStem(segment, yymmdd, nextSeq);
  const { videoKey, posterKey } = videoPortKeysForStem(segment, stem, root);
  const id = randomBytes(12).toString("hex");
  const stagingPrefix = `${VIDEO_PORT_TEMP_PREFIX}.parts/${id}/`;

  return NextResponse.json({
    ok: true,
    videoKey,
    posterKey: body.withPoster === false ? null : posterKey,
    stem,
    pillar: segment,
    root,
    stagingPrefix,
    contentType: "video/mp4",
    partSize: 3 * 1024 * 1024,
    bytes: typeof body.bytes === "number" ? body.bytes : null,
  });
}
