import { brightlineSiteOrigin } from "@/lib/platform/identity/sso/config";
import { mirotechSiteOrigin } from "@/lib/mirotech-site";
import type { SsoAudience } from "@/lib/platform/identity/sso/types";
import type { TenantSlug } from "@/lib/platform/tenants/types";

const ALLOWED_ORIGINS = new Set([
  brightlineSiteOrigin().toLowerCase(),
  mirotechSiteOrigin().toLowerCase(),
  "https://brightlinephotography.com",
  "https://www.brightlinephotography.com",
  "https://mirotech.solutions",
  "https://www.mirotech.solutions",
]);

/** Sanitize post-SSO return path on the receiving site (no open redirect). */
export function sanitizeSsoReturnPath(
  raw: string | null | undefined,
  audience: SsoAudience
): string {
  const fallback = audience === "mirotech" ? "/admin" : "/admin";
  if (!raw?.trim()) return fallback;

  let path = raw.trim();
  try {
    if (/^https?:\/\//i.test(path)) {
      const u = new URL(path);
      const origin = `${u.protocol}//${u.host}`.toLowerCase();
      if (!ALLOWED_ORIGINS.has(origin)) return fallback;
      path = `${u.pathname}${u.search}`;
    }
  } catch {
    return fallback;
  }

  if (!path.startsWith("/")) path = `/${path}`;
  if (!path.startsWith("/admin") && !path.startsWith("/studio")) return fallback;
  if (path.includes("\\") || path.includes("..")) return fallback;
  return path.slice(0, 200) || fallback;
}

export function isAllowedSsoRedirectOrigin(origin: string): boolean {
  try {
    const normalized = origin.trim().replace(/\/$/, "").toLowerCase();
    return ALLOWED_ORIGINS.has(normalized);
  } catch {
    return false;
  }
}

export function currentSiteAudienceFromHost(host: string | null): TenantSlug | null {
  const h = (host ?? "").toLowerCase();
  if (h.includes("mirotech.solutions")) return "mirotech";
  if (h.includes("brightlinephotography.com") || h === "localhost" || h.startsWith("127.0.0.1")) {
    return "brightline";
  }
  return null;
}
