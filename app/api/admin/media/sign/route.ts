import { NextResponse } from "next/server";
import { guardAdminJson } from "@/lib/api/guards";
import { jsonErr } from "@/lib/api/http";
import { auditAdminMediaPreviewUrlCreated } from "@/lib/platform/audit/integrations/admin-media-preview-url";
import { isPlatformFeatureEnabled } from "@/lib/platform/features";
import { createAdminMediaSignRedirectUrl } from "@/lib/platform/media/integrations/admin-media-sign";
import { defaultMediaService } from "@/lib/platform/media/server";
import { isAdminSignableMediaKey, isPublicMediaKey } from "@/lib/media-key-access";
import { signGet } from "@/lib/storage-r2";
import { signPublicR2Get } from "@/lib/storage-r2-public";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Admin-only signed read for allowlisted media/receipt prefixes. */
export async function GET(req: Request) {
  const denied = await guardAdminJson(req);
  if (denied) return denied;

  const key = new URL(req.url).searchParams.get("key")?.trim().replace(/^\/+/, "") || "";
  if (!key) {
    return jsonErr("key is required.", 400);
  }
  if (!isAdminSignableMediaKey(key)) {
    return jsonErr("Invalid media key.", 400);
  }

  try {
    let redirectUrl: string;
    if (isPlatformFeatureEnabled("media")) {
      redirectUrl = await createAdminMediaSignRedirectUrl(defaultMediaService, key);
      await auditAdminMediaPreviewUrlCreated({
        route: "/api/admin/media/sign",
        key,
      });
    } else {
      const signed = isPublicMediaKey(key)
        ? await signPublicR2Get({ key, expiresIn: 300 })
        : await signGet({ key, expiresIn: 300 });
      redirectUrl = signed.url;
    }

    const res = NextResponse.redirect(redirectUrl, { status: 302 });
    res.headers.set("Cache-Control", "private, max-age=60");
    return res;
  } catch (e) {
    console.error("ADMIN_MEDIA_SIGN_ERROR", e);
    return jsonErr("Media temporarily unavailable.", 503);
  }
}
