import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { auditSiteMediaUploadUrlCreated } from "@/lib/platform/audit/integrations/site-media-upload-url";
import { isPlatformFeatureEnabled } from "@/lib/platform/features";
import { createSiteMediaUploadUrlViaMediaService, siteMediaUploadUrlErrorMessage } from "@/lib/platform/media/integrations/site-media-upload-url";
import { defaultMediaService } from "@/lib/platform/media/server";
import { getPublicR2Url } from "@/lib/r2";
import {
  buildSiteMediaObjectKey,
  resolveSiteMediaFolder,
  safeSiteMediaFilename,
} from "@/lib/site-media-upload-url";
import { signPut } from "@/lib/storage-r2";
import { isAllowedImageOrVideoUpload } from "@/lib/upload-mime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const isAdmin = await authorizeAdminRequest(req);
  if (!isAdmin) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  let body: { filename?: string; contentType?: string; folder?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const filename = safeSiteMediaFilename(body.filename ?? "");
  const contentType = isAllowedImageOrVideoUpload(body.contentType);
  const folder = resolveSiteMediaFolder(body.folder);

  if (!filename) {
    return NextResponse.json({ ok: false, error: "filename is required." }, { status: 400 });
  }
  if (!contentType) {
    return NextResponse.json(
      { ok: false, error: "Only allowed image/video types are supported (not SVG/HTML)." },
      { status: 400 }
    );
  }

  const key = buildSiteMediaObjectKey(folder, filename);

  if (isPlatformFeatureEnabled("media")) {
    try {
      const result = await createSiteMediaUploadUrlViaMediaService(defaultMediaService, {
        objectKey: key,
        contentType,
      });
      await auditSiteMediaUploadUrlCreated({ key, folder, contentType });
      return NextResponse.json(result);
    } catch (error) {
      console.error("[site-media/upload-url] MediaService path failed:", error);
      return NextResponse.json(
        { ok: false, error: siteMediaUploadUrlErrorMessage(error) },
        { status: 500 }
      );
    }
  }

  // Legacy path — unchanged until full migration (Phase 3C flag off by default).
  const signed = await signPut({ key, contentType, access: "public-read" });
  return NextResponse.json({
    ok: true,
    url: signed.url,
    headers: signed.headers,
    key,
    publicUrl: getPublicR2Url(key),
  });
}
