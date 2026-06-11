import { NextResponse } from "next/server";
import { resolveDeliverablePackageItem } from "@/lib/client-api/delivery-package";
import { signGet } from "@/lib/storage-r2";
import { signPublicR2Get } from "@/lib/storage-r2-public";
import { isPublicMediaKey } from "@/lib/media-key-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function previewKeyForItem(item: {
  storageKey: string | null;
  mediaAsset: { keyThumb: string | null; keyFull: string | null };
}) {
  return item.mediaAsset.keyThumb ?? item.storageKey ?? item.mediaAsset.keyFull;
}

/** Token-gated preview redirect — avoids exposing portfolio keys via `/api/media/public`. */
export async function GET(
  req: Request,
  context: { params: Promise<{ accessToken: string; itemId: string }> }
) {
  const { accessToken, itemId } = await context.params;
  const resolved = await resolveDeliverablePackageItem(accessToken, itemId);
  if (!resolved.ok) {
    return NextResponse.json({ ok: false, error: "File not found." }, { status: 404 });
  }

  const key = previewKeyForItem(resolved.item);
  if (!key) {
    return NextResponse.json({ ok: false, error: "File not found." }, { status: 404 });
  }

  try {
    const signed = isPublicMediaKey(key)
      ? await signPublicR2Get({ key, expiresIn: 300 })
      : await signGet({ key, expiresIn: 300 });
    const res = NextResponse.redirect(signed.url, { status: 302 });
    res.headers.set("Cache-Control", "private, max-age=120");
    return res;
  } catch (e) {
    console.error("PACKAGE_PREVIEW_SIGN_ERROR", e);
    return NextResponse.json({ ok: false, error: "Media temporarily unavailable." }, { status: 503 });
  }
}
