import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata.goog",
]);

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split(".").map((p) => Number(p));
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return true;
  }
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  return false;
}

function isPrivateIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized === "::1" || normalized === "::") return true;

  // IPv4-mapped IPv6 (::ffff:127.0.0.1) — evaluate the embedded IPv4.
  const v4Mapped = normalized.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i);
  if (v4Mapped?.[1]) return isPrivateIpv4(v4Mapped[1]);

  // Compact hex form ::ffff:7f00:1
  const v4MappedHex = normalized.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
  if (v4MappedHex) {
    const hi = parseInt(v4MappedHex[1]!, 16);
    const lo = parseInt(v4MappedHex[2]!, 16);
    if (Number.isFinite(hi) && Number.isFinite(lo)) {
      const a = (hi >> 8) & 0xff;
      const b = hi & 0xff;
      const c = (lo >> 8) & 0xff;
      const d = lo & 0xff;
      return isPrivateIpv4(`${a}.${b}.${c}.${d}`);
    }
  }

  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true; // unique local
  if (
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb")
  ) {
    return true; // link-local
  }
  return false;
}

function isBlockedIp(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return isPrivateIpv4(ip);
  if (version === 6) return isPrivateIpv6(ip);
  return true;
}

export function assertPublicHttpUrl(rawUrl: string, origin?: string): URL {
  let url: URL;
  try {
    url = new URL(rawUrl, origin);
  } catch {
    throw Object.assign(new Error("Invalid URL."), { status: 400 });
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw Object.assign(new Error("Only http(s) URLs are allowed."), { status: 400 });
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!hostname || BLOCKED_HOSTNAMES.has(hostname) || hostname.endsWith(".localhost")) {
    throw Object.assign(new Error("URL host is not allowed."), { status: 400 });
  }

  if (isIP(hostname)) {
    if (isBlockedIp(hostname)) {
      throw Object.assign(new Error("URL host is not allowed."), { status: 400 });
    }
    return url;
  }

  return url;
}

/** Resolve hostname and reject private/link-local targets (SSRF guard). */
export async function assertPublicHttpUrlResolved(rawUrl: string, origin?: string): Promise<URL> {
  const url = assertPublicHttpUrl(rawUrl, origin);
  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();

  if (isIP(hostname)) return url;

  let addresses: { address: string; family: number }[];
  try {
    addresses = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw Object.assign(new Error("Could not resolve URL host."), { status: 400 });
  }

  if (!addresses.length) {
    throw Object.assign(new Error("Could not resolve URL host."), { status: 400 });
  }

  for (const entry of addresses) {
    if (isBlockedIp(entry.address)) {
      throw Object.assign(new Error("URL host is not allowed."), { status: 400 });
    }
  }

  return url;
}
