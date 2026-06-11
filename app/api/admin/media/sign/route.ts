import { NextResponse } from "next/server";
import { guardAdminJson } from "@/lib/api/guards";
import { jsonErr } from "@/lib/api/http";
import { isPrivateMediaKey, isPublicMediaKey } from "@/lib/media-key-access";
import { signGet } from "@/lib/storage-r2";
import { signPublicR2Get } from "@/lib/storage-r2-public";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Admin-only signed read for private vault keys (e.g. client-galleries/). */
export async function GET(req: Request) {
  const denied = await guardAdminJson(req);
  if (denied) return denied;

  const key = new URL(req.url).searchParams.get("key")?.trim().replace(/^\/+/, "") || "";
  if (!key) {
    return jsonErr("key is required.", 400);
  }
  if (!isPrivateMediaKey(key) && !isPublicMediaKey(key)) {
    return jsonErr("Unsupported media key prefix.", 400);
  }

  try {
    const signed = isPrivateMediaKey(key)
      ? await signGet({ key, expiresIn: 300 })
      : await signPublicR2Get({ key, expiresIn: 300 });
    const res = NextResponse.redirect(signed.url, { status: 302 });
    res.headers.set("Cache-Control", "private, max-age=60");
    return res;
  } catch (e) {
    console.error("ADMIN_MEDIA_SIGN_ERROR", e);
    return jsonErr("Media temporarily unavailable.", 503);
  }
}
