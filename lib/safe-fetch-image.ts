import { assertPublicHttpUrlResolved } from "@/lib/ssrf-guard";
import { isTrustedR2Host } from "@/lib/r2";

const MAX_IMAGE_BYTES = 40 * 1024 * 1024;
const MAX_REDIRECTS = 4;

function isAllowedImageHost(hostname: string, originHost: string): boolean {
  const h = hostname.toLowerCase();
  const origin = originHost.toLowerCase();
  if (h === origin) return true;
  if (h === "localhost" || h === "127.0.0.1") {
    return origin === "localhost" || origin === "127.0.0.1";
  }
  if (
    h === "brightlinephotography.com" ||
    h.endsWith(".brightlinephotography.com") ||
    h.endsWith(".vercel.app")
  ) {
    return true;
  }
  return isTrustedR2Host(h);
}

/**
 * SSRF-safe image fetch: public DNS, host allowlist, manual redirects, raster-only, size cap.
 */
export async function fetchTrustedImageBytes(
  url: string,
  origin: string
): Promise<Buffer> {
  let originHost = "brightlinephotography.com";
  try {
    originHost = new URL(origin).hostname;
  } catch {
    /* keep default */
  }

  let current = (await assertPublicHttpUrlResolved(url, origin)).toString();
  if (!isAllowedImageHost(new URL(current).hostname, originHost)) {
    throw Object.assign(new Error("Image host is not allowed."), { status: 400 });
  }

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const host = new URL(current).hostname;
    if (!isAllowedImageHost(host, originHost)) {
      throw Object.assign(new Error("Image host is not allowed."), { status: 400 });
    }

    const res = await fetch(current, {
      method: "GET",
      redirect: "manual",
      headers: { Accept: "image/*,*/*;q=0.8" },
      signal: AbortSignal.timeout(20000),
    });

    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const loc = res.headers.get("location");
      if (!loc) {
        throw Object.assign(new Error("Image redirect missing Location."), { status: 400 });
      }
      current = (await assertPublicHttpUrlResolved(new URL(loc, current).toString(), origin)).toString();
      continue;
    }

    if (!res.ok) {
      throw Object.assign(new Error(`Could not fetch source image (${res.status}).`), {
        status: 400,
      });
    }

    const contentType = (res.headers.get("content-type") || "").split(";")[0]!.trim().toLowerCase();
    if (contentType && !contentType.startsWith("image/")) {
      throw Object.assign(new Error("Source URL must be an image."), { status: 400 });
    }
    if (contentType === "image/svg+xml") {
      throw Object.assign(new Error("SVG sources are not allowed."), { status: 400 });
    }

    const len = res.headers.get("content-length");
    if (len && Number(len) > MAX_IMAGE_BYTES) {
      throw Object.assign(new Error("Source image is too large."), { status: 400 });
    }

    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.byteLength < 100) {
      throw Object.assign(new Error("Source image was empty."), { status: 400 });
    }
    if (bytes.byteLength > MAX_IMAGE_BYTES) {
      throw Object.assign(new Error("Source image is too large."), { status: 400 });
    }
    return bytes;
  }

  throw Object.assign(new Error("Too many redirects."), { status: 400 });
}

/** Fetch a trusted raster image and return a `data:` URL for vision model APIs. */
export async function trustedImageToDataUrl(
  imageUrl: string,
  origin: string,
  maxBytes = 8 * 1024 * 1024
): Promise<string> {
  const bytes = await fetchTrustedImageBytes(imageUrl, origin);
  if (bytes.byteLength > maxBytes) {
    throw Object.assign(new Error("Image is too large for AI analysis."), { status: 400 });
  }
  return `data:image/jpeg;base64,${bytes.toString("base64")}`;
}
