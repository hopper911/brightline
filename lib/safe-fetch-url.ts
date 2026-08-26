import { assertPublicHttpUrlResolved } from "@/lib/ssrf-guard";

const MAX_REDIRECTS = 4;
const DEFAULT_MAX_BYTES = 80 * 1024 * 1024;

function hostAllowed(hostname: string, suffixes?: readonly string[]): boolean {
  if (!suffixes?.length) return true;
  const h = hostname.toLowerCase();
  return suffixes.some((suffix) => {
    const s = suffix.toLowerCase();
    return h === s || h.endsWith(`.${s}`);
  });
}

/**
 * SSRF-safe GET with manual redirects + optional host suffix allowlist.
 * Use for provider downloads (fal, Canva) instead of `fetch(..., { redirect: "follow" })`.
 */
export async function fetchPublicUrlBytes(
  rawUrl: string,
  options?: {
    origin?: string;
    maxBytes?: number;
    allowedHostSuffixes?: readonly string[];
    accept?: string;
    timeoutMs?: number;
  }
): Promise<{ bytes: Buffer; contentType: string; finalUrl: string }> {
  const maxBytes = options?.maxBytes ?? DEFAULT_MAX_BYTES;
  const timeoutMs = options?.timeoutMs ?? 30_000;
  let current = (await assertPublicHttpUrlResolved(rawUrl, options?.origin)).toString();

  if (!hostAllowed(new URL(current).hostname, options?.allowedHostSuffixes)) {
    throw Object.assign(new Error("Download host is not allowed."), { status: 400 });
  }

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const host = new URL(current).hostname;
    if (!hostAllowed(host, options?.allowedHostSuffixes)) {
      throw Object.assign(new Error("Download host is not allowed."), { status: 400 });
    }

    const res = await fetch(current, {
      method: "GET",
      redirect: "manual",
      headers: options?.accept ? { Accept: options.accept } : undefined,
      signal: AbortSignal.timeout(timeoutMs),
    });

    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const loc = res.headers.get("location");
      if (!loc) {
        throw Object.assign(new Error("Redirect missing Location."), { status: 400 });
      }
      current = (
        await assertPublicHttpUrlResolved(new URL(loc, current).toString(), options?.origin)
      ).toString();
      continue;
    }

    if (!res.ok) {
      throw Object.assign(new Error(`Could not download resource (${res.status}).`), {
        status: 502,
      });
    }

    const len = res.headers.get("content-length");
    if (len && Number(len) > maxBytes) {
      throw Object.assign(new Error("Downloaded file is too large."), { status: 400 });
    }

    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.byteLength > maxBytes) {
      throw Object.assign(new Error("Downloaded file is too large."), { status: 400 });
    }

    const contentType = (res.headers.get("content-type") || "application/octet-stream")
      .split(";")[0]!
      .trim()
      .toLowerCase();

    return { bytes, contentType, finalUrl: current };
  }

  throw Object.assign(new Error("Too many redirects."), { status: 400 });
}

/** Hosts used by fal.ai CDN / queue result URLs. */
export const FAL_DOWNLOAD_HOST_SUFFIXES = ["fal.media", "fal.run", "fal.ai"] as const;

/** Hosts used by Canva design export downloads. */
export const CANVA_DOWNLOAD_HOST_SUFFIXES = ["canva.com", "canva.cn"] as const;
