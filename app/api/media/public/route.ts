import { NextResponse } from "next/server";
import { isAllowedPublicMediaKey } from "@/lib/media-key-access";
import { publicMediaKeyFallbacks } from "@/lib/media-key-fallback";
import { getClientIp, isRateLimitedAsync } from "@/lib/permissions/rate-limit";
import { extractPublicMediaKey } from "@/lib/r2-key";
import { headPublicR2Object, signPublicR2Get } from "@/lib/storage-r2-public";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FALLBACK_TTL_MS = 10 * 60 * 1000;
const resolvedKeyCache = new Map<string, { key: string; exp: number }>();

function normalizeRequestedKey(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("/")) {
    return extractPublicMediaKey(trimmed)?.replace(/^\/+/, "") || "";
  }
  const extracted = extractPublicMediaKey(trimmed);
  if (extracted && !/^https?:\/\//i.test(extracted)) return extracted.replace(/^\/+/, "");
  return trimmed.replace(/^\/+/, "");
}

async function resolveExistingPublicKey(key: string): Promise<string> {
  const cached = resolvedKeyCache.get(key);
  if (cached && cached.exp > Date.now()) return cached.key;

  const fallbacks = publicMediaKeyFallbacks(key);
  let resolved = key;
  if (fallbacks.length > 0) {
    const exists = await headPublicR2Object(key);
    if (!exists) {
      for (const alt of fallbacks) {
        if (!isAllowedPublicMediaKey(alt)) continue;
        if (await headPublicR2Object(alt)) {
          resolved = alt;
          break;
        }
      }
    }
  }

  resolvedKeyCache.set(key, { key: resolved, exp: Date.now() + FALLBACK_TTL_MS });
  if (resolvedKeyCache.size > 2000) {
    const now = Date.now();
    for (const [k, v] of resolvedKeyCache) {
      if (v.exp <= now) resolvedKeyCache.delete(k);
    }
  }
  return resolved;
}

export async function GET(req: Request) {
  const ip = getClientIp(req);
  if (
    await isRateLimitedAsync(ip, { scope: "media-public", max: 240, windowMs: 60_000 }) ||
    await isRateLimitedAsync(ip, { scope: "media-public-burst", max: 80, windowMs: 10_000 })
  ) {
    return NextResponse.json(
      { ok: false, error: "Too many requests. Try again shortly." },
      { status: 429, headers: { "Retry-After": "30" } }
    );
  }

  const url = new URL(req.url);
  const key = normalizeRequestedKey(url.searchParams.get("key") || "");
  if (!key || !isAllowedPublicMediaKey(key)) {
    return NextResponse.json({ ok: false, error: "Invalid media key." }, { status: 400 });
  }

  // Block path traversal / null-byte tricks even if allowlist regex is loose.
  if (key.includes("..") || key.includes("\0") || key.includes("\\")) {
    return NextResponse.json({ ok: false, error: "Invalid media key." }, { status: 400 });
  }

  const resolvedKey = await resolveExistingPublicKey(key);

  let signed: { url: string };
  try {
    // Keep signature TTL well above any CDN/browser cache of this redirect.
    signed = await signPublicR2Get({ key: resolvedKey, expiresIn: 3600 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Storage error";
    console.error("MEDIA_PUBLIC_SIGN_ERROR", msg);
    return NextResponse.json(
      { ok: false, error: "Media temporarily unavailable." },
      { status: 503 }
    );
  }

  // Same-origin bytes so `<img crossOrigin="anonymous">` + canvas export works (302 to R2/CDN breaks CORS).
  if (url.searchParams.get("proxy") === "1") {
    // Proxy is heavier — tighter limit.
    if (await isRateLimitedAsync(ip, { scope: "media-public-proxy", max: 60, windowMs: 60_000 })) {
      return NextResponse.json(
        { ok: false, error: "Too many requests. Try again shortly." },
        { status: 429, headers: { "Retry-After": "30" } }
      );
    }

    let upstream: Response;
    try {
      upstream = await fetch(signed.url, { redirect: "follow" });
    } catch (err) {
      console.error("MEDIA_PUBLIC_PROXY_FETCH_ERROR", err);
      return NextResponse.json(
        { ok: false, error: "Media temporarily unavailable." },
        { status: 502 }
      );
    }
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json(
        { ok: false, error: "Media temporarily unavailable." },
        { status: upstream.status >= 400 ? upstream.status : 502 }
      );
    }
    const contentTypeRaw =
      upstream.headers.get("content-type") ?? "application/octet-stream";
    const contentType = contentTypeRaw.split(";")[0]!.trim().toLowerCase();
    const safeInline =
      contentType.startsWith("image/") ||
      contentType.startsWith("video/") ||
      contentType.startsWith("audio/") ||
      contentType === "application/pdf" ||
      contentType.startsWith("font/") ||
      contentType === "application/font-woff" ||
      contentType === "application/font-woff2";
    // Never serve HTML/SVG as navigable documents on the app origin (stored XSS).
    if (
      contentType === "text/html" ||
      contentType === "application/xhtml+xml" ||
      contentType === "image/svg+xml" ||
      contentType.includes("script")
    ) {
      return NextResponse.json({ ok: false, error: "Unsupported media type." }, { status: 415 });
    }
    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": contentTypeRaw,
        "Cache-Control": "private, max-age=120",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": safeInline
          ? 'inline; filename="brightline-preview"'
          : 'attachment; filename="brightline-download"',
        "Cross-Origin-Resource-Policy": "same-origin",
      },
    });
  }

  const res = NextResponse.redirect(signed.url, { status: 302 });
  // Never cache signed Locations — cached redirects expire into broken images (403/404).
  res.headers.set("Cache-Control", "private, no-store");
  res.headers.set("X-Content-Type-Options", "nosniff");
  return res;
}
