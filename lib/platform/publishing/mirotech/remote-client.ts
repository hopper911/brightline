/**
 * Mirotech Content API remote client (Phase 6D).
 * Owns bearer auth and HTTP transport — not Brightline application routes.
 */

import { mirotechSiteOrigin } from "@/lib/mirotech-site";

export function mirotechPublishBearer(): string | null {
  const candidates = [
    process.env.CONTENT_API_SECRET?.trim(),
    process.env.MIROTECH_ADMIN_HANDOFF_SECRET?.trim(),
    process.env.ADMIN_HANDOFF_SECRET?.trim(),
  ].filter((v): v is string => Boolean(v && v.length >= 16));
  return candidates[0] ?? null;
}

export function isMirotechRemotePublishConfigured(): boolean {
  return Boolean(mirotechPublishBearer());
}

export async function mirotechContentFetch(
  path: string,
  init?: RequestInit
): Promise<Record<string, unknown>> {
  const bearer = mirotechPublishBearer();
  if (!bearer) {
    throw new Error(
      "Mirotech publish remote not configured (CONTENT_API_SECRET or MIROTECH_ADMIN_HANDOFF_SECRET)."
    );
  }
  const res = await fetch(`${mirotechSiteOrigin()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${bearer}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || data.ok === false) {
    throw new Error(
      typeof data.error === "string" ? data.error : `Mirotech remote request failed (${res.status})`
    );
  }
  return data;
}

export { mirotechSiteOrigin };
