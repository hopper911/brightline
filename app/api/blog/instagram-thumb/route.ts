import { NextResponse } from "next/server";
import { extractInstagramPermalink } from "@/lib/blog-post-model";
import {
  fetchInstagramMediaBytes,
  fetchInstagramOgImageUrl,
  isInstagramMediaHost,
  isInstagramPageHost,
} from "@/lib/instagram-thumb-proxy";
import { getClientIp, isRateLimitedAsync } from "@/lib/permissions/rate-limit";
import { assertPublicHttpUrl } from "@/lib/ssrf-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAllowedThumbConsumer(req: Request): boolean {
  const site = (req.headers.get("sec-fetch-site") || "").toLowerCase();
  if (site === "same-origin" || site === "same-site" || site === "none") return true;

  const referer = req.headers.get("referer") || "";
  const origin = req.headers.get("origin") || "";
  const candidates = [origin, referer].filter(Boolean);
  // Privacy browsers may omit Referer/Origin — allow (rate limits still apply).
  if (!candidates.length) return true;

  for (const raw of candidates) {
    try {
      const host = new URL(raw).hostname.toLowerCase();
      if (
        host === "localhost" ||
        host === "127.0.0.1" ||
        host === "brightlinephotography.com" ||
        host.endsWith(".brightlinephotography.com") ||
        host.endsWith(".vercel.app")
      ) {
        return true;
      }
    } catch {
      /* ignore */
    }
  }
  return false;
}

/**
 * Same-origin Instagram thumbnail proxy.
 * ?url= permalink → resolve og:image then stream bytes
 * ?src= CDN image URL → stream bytes (media hosts only)
 */
export async function GET(req: Request) {
  const ip = getClientIp(req);
  if (
    (await isRateLimitedAsync(ip, { scope: "ig-thumb", max: 90, windowMs: 60_000 })) ||
    (await isRateLimitedAsync(ip, { scope: "ig-thumb-burst", max: 20, windowMs: 10_000 }))
  ) {
    return NextResponse.json(
      { ok: false, error: "Too many requests." },
      { status: 429, headers: { "Retry-After": "30" } }
    );
  }

  if (!isAllowedThumbConsumer(req)) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  const q = new URL(req.url).searchParams;
  const permalinkRaw = q.get("url")?.trim() || "";
  const srcRaw = q.get("src")?.trim() || "";

  try {
    let imageUrl = "";

    if (permalinkRaw) {
      const permalink = extractInstagramPermalink(permalinkRaw);
      if (!permalink) {
        return NextResponse.json({ ok: false, error: "Invalid Instagram URL." }, { status: 400 });
      }
      const page = assertPublicHttpUrl(permalink);
      if (!isInstagramPageHost(page.hostname)) {
        return NextResponse.json({ ok: false, error: "Invalid Instagram URL." }, { status: 400 });
      }
      const og = await fetchInstagramOgImageUrl(permalink);
      if (!og) {
        return NextResponse.json(
          { ok: false, error: "Could not resolve Instagram thumbnail." },
          { status: 404 }
        );
      }
      imageUrl = og;
    } else if (srcRaw) {
      const src = assertPublicHttpUrl(srcRaw);
      if (!isInstagramMediaHost(src.hostname)) {
        return NextResponse.json({ ok: false, error: "Image host is not allowed." }, { status: 400 });
      }
      imageUrl = src.toString();
    } else {
      return NextResponse.json(
        { ok: false, error: "url or src is required." },
        { status: 400 }
      );
    }

    const { bytes, contentType } = await fetchInstagramMediaBytes(imageUrl);
    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": 'inline; filename="instagram-thumb.jpg"',
        "Cross-Origin-Resource-Policy": "same-origin",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch (err) {
    const status =
      err && typeof err === "object" && "status" in err && typeof err.status === "number"
        ? err.status
        : 502;
    const message = err instanceof Error ? err.message : "Thumbnail unavailable.";
    console.error("IG_THUMB_PROXY_ERROR", message);
    return NextResponse.json({ ok: false, error: "Thumbnail unavailable." }, { status });
  }
}
