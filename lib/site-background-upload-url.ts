/** Shared helpers for admin site-background presigned upload URLs. */

import { SITE_BACKGROUNDS_PREFIX } from "@/lib/site-background-videos";

export type SiteBackgroundFolder = "full" | "web" | "posters";

export function safeSiteBackgroundFileName(name: string): string {
  return name
    .trim()
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 160);
}

export function resolveSiteBackgroundFolder(folder: string | undefined): SiteBackgroundFolder {
  if (folder === "web") return "web";
  if (folder === "posters") return "posters";
  return "full";
}

export function buildSiteBackgroundObjectKey(
  folder: SiteBackgroundFolder,
  fileName: string,
  now: number = Date.now()
): string {
  return `${SITE_BACKGROUNDS_PREFIX}${folder}/${now}-${fileName}`;
}

export type SiteBackgroundUploadUrlSuccess = {
  ok: true;
  key: string;
  uploadUrl: string;
  headers: Record<string, string>;
  expiresIn: number;
};
