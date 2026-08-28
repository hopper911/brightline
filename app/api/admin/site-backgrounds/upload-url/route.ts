import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { auditAdminMediaUploadUrlCreated } from "@/lib/platform/audit/integrations/admin-media-upload-url";
import { isPlatformFeatureEnabled } from "@/lib/platform/features";
import { adminMediaUploadUrlErrorMessage } from "@/lib/platform/media/integrations/errors";
import { createSiteBackgroundUploadUrlViaMediaService } from "@/lib/platform/media/integrations/site-background-upload-url";
import { defaultMediaService } from "@/lib/platform/media/server";
import {
  buildSiteBackgroundObjectKey,
  resolveSiteBackgroundFolder,
  safeSiteBackgroundFileName,
} from "@/lib/site-background-upload-url";
import { signPut } from "@/lib/storage-r2";
import { isAllowedImageOrVideoUpload } from "@/lib/upload-mime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  let body: { fileName?: string; contentType?: string; folder?: "full" | "web" | "posters" };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const fileName = safeSiteBackgroundFileName(body.fileName ?? "");
  if (!fileName) {
    return NextResponse.json({ ok: false, error: "fileName is required." }, { status: 400 });
  }

  const folder = resolveSiteBackgroundFolder(body.folder);
  const key = buildSiteBackgroundObjectKey(folder, fileName);
  const contentType = isAllowedImageOrVideoUpload(body.contentType);
  if (!contentType) {
    return NextResponse.json(
      { ok: false, error: "Only allowed image/video types are supported (not SVG/HTML)." },
      { status: 400 }
    );
  }

  if (isPlatformFeatureEnabled("media")) {
    try {
      const result = await createSiteBackgroundUploadUrlViaMediaService(defaultMediaService, {
        objectKey: key,
        contentType,
      });
      await auditAdminMediaUploadUrlCreated({
        route: "/api/admin/site-backgrounds/upload-url",
        key,
        contentType,
        metadata: { folder },
      });
      return NextResponse.json(result);
    } catch (error) {
      console.error("[site-backgrounds/upload-url] MediaService path failed:", error);
      return NextResponse.json(
        { ok: false, error: adminMediaUploadUrlErrorMessage(error) },
        { status: 500 }
      );
    }
  }

  // Legacy path — unchanged until full migration (Phase 3D flag off by default).
  try {
    const signed = await signPut({
      key,
      contentType,
      // Avoid x-amz-acl on browser PUTs (CORS preflight). site/ is served via /api/media/public.
      access: "private",
    });
    return NextResponse.json({
      ok: true,
      key,
      uploadUrl: signed.url,
      headers: signed.headers,
      expiresIn: signed.expiresIn,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload URL failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
