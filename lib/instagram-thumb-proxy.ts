import { assertPublicHttpUrlResolved } from "@/lib/ssrf-guard";
import { extractInstagramPermalink } from "@/lib/blog-post-model";

const MAX_THUMB_BYTES = 2 * 1024 * 1024;
const MAX_HTML_BYTES = 512 * 1024;
const MAX_REDIRECTS = 4;

export function isInstagramPageHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === "instagram.com" || h === "www.instagram.com";
}

export function isInstagramMediaHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return (
    h === "cdninstagram.com" ||
    h.endsWith(".cdninstagram.com") ||
    h === "fbcdn.net" ||
    h.endsWith(".fbcdn.net")
  );
}

export function proxiedInstagramThumbUrl(permalink: string): string {
  return `/api/blog/instagram-thumb?url=${encodeURIComponent(permalink)}`;
}

export function proxiedInstagramSrcUrl(src: string): string {
  return `/api/blog/instagram-thumb?src=${encodeURIComponent(src)}`;
}

function isAllowedRaster(contentType: string): boolean {
  const ct = contentType.split(";")[0]!.trim().toLowerCase();
  if (!ct.startsWith("image/")) return false;
  if (ct === "image/svg+xml") return false;
  return true;
}

function contentLengthTooLarge(res: Response, maxBytes: number): boolean {
  const len = res.headers.get("content-length");
  if (!len) return false;
  const n = Number(len);
  return Number.isFinite(n) && n > maxBytes;
}

/** Stream response body with a hard byte cap (abort early on oversized payloads). */
async function readBodyWithCap(res: Response, maxBytes: number): Promise<Buffer> {
  if (contentLengthTooLarge(res, maxBytes)) {
    throw Object.assign(new Error("Response is too large."), { status: 400 });
  }

  if (!res.body) {
    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.byteLength === 0 || bytes.byteLength > maxBytes) {
      throw Object.assign(new Error("Response is empty or too large."), { status: 400 });
    }
    return bytes;
  }

  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value?.byteLength) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        throw Object.assign(new Error("Response is too large."), { status: 400 });
      }
      chunks.push(value);
    }
  } finally {
    try {
      await reader.cancel();
    } catch {
      /* ignore */
    }
  }

  if (total === 0) {
    throw Object.assign(new Error("Response is empty or too large."), { status: 400 });
  }

  return Buffer.concat(chunks.map((c) => Buffer.from(c)));
}

/**
 * Resolve og:image from an Instagram permalink (SSRF-safe).
 */
export async function fetchInstagramOgImageUrl(permalinkInput: string): Promise<string | null> {
  const permalink = extractInstagramPermalink(permalinkInput);
  if (!permalink) return null;

  const start = await assertPublicHttpUrlResolved(permalink);
  if (!isInstagramPageHost(start.hostname)) return null;

  let current = start.toString();
  let html = "";

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const res = await fetch(current, {
      method: "GET",
      redirect: "manual",
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent":
          "Mozilla/5.0 (compatible; BrightlineBot/1.0; +https://brightlinephotography.com)",
      },
      signal: AbortSignal.timeout(8000),
    });

    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const loc = res.headers.get("location");
      if (!loc) return null;
      const next = await assertPublicHttpUrlResolved(new URL(loc, current).toString());
      if (!isInstagramPageHost(next.hostname)) return null;
      current = next.toString();
      continue;
    }

    if (!res.ok) return null;
    const ct = (res.headers.get("content-type") || "").toLowerCase();
    if (!ct.includes("text/html") && !ct.includes("application/xhtml")) return null;
    try {
      html = (await readBodyWithCap(res, MAX_HTML_BYTES)).toString("utf8");
    } catch {
      return null;
    }
    break;
  }

  if (!html) return null;

  const og =
    html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) ||
    html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);

  const raw = og?.[1]?.trim();
  if (!raw) return null;
  const abs = new URL(raw, permalink);
  if (abs.protocol !== "https:" && abs.protocol !== "http:") return null;
  return abs.toString();
}

/**
 * Fetch Instagram CDN image bytes with SSRF checks on every hop.
 * Only media hosts (not page hosts) — stream-capped to MAX_THUMB_BYTES.
 */
export async function fetchInstagramMediaBytes(imageUrl: string): Promise<{
  bytes: Buffer;
  contentType: string;
}> {
  let current = (await assertPublicHttpUrlResolved(imageUrl)).toString();
  if (!isInstagramMediaHost(new URL(current).hostname)) {
    throw Object.assign(new Error("Image host is not allowed."), { status: 400 });
  }

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const host = new URL(current).hostname;
    if (!isInstagramMediaHost(host)) {
      throw Object.assign(new Error("Image host is not allowed."), { status: 400 });
    }

    const res = await fetch(current, {
      method: "GET",
      redirect: "manual",
      headers: {
        Accept: "image/*,*/*;q=0.8",
        "User-Agent":
          "Mozilla/5.0 (compatible; BrightlineBot/1.0; +https://brightlinephotography.com)",
      },
      signal: AbortSignal.timeout(10000),
    });

    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const loc = res.headers.get("location");
      if (!loc) throw Object.assign(new Error("Redirect missing Location."), { status: 400 });
      current = (await assertPublicHttpUrlResolved(new URL(loc, current).toString())).toString();
      continue;
    }

    if (!res.ok) {
      throw Object.assign(new Error(`Could not load thumbnail (${res.status}).`), {
        status: 502,
      });
    }

    const contentTypeRaw = res.headers.get("content-type") || "image/jpeg";
    const contentType = contentTypeRaw.split(";")[0]!.trim().toLowerCase();
    if (!isAllowedRaster(contentType)) {
      throw Object.assign(new Error("Unsupported thumbnail type."), { status: 415 });
    }

    const bytes = await readBodyWithCap(res, MAX_THUMB_BYTES);
    return { bytes, contentType: contentTypeRaw };
  }

  throw Object.assign(new Error("Too many redirects."), { status: 400 });
}
