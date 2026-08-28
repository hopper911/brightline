/** Shared helpers for admin CMS site-media presigned upload URLs. */

export const SITE_MEDIA_ALLOWED_FOLDERS = new Set([
  "pages",
  "services",
  "blocks",
  "theme",
  "projects",
]);

export function safeSiteMediaFilename(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? "media";
  return base.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 140) || "media";
}

export function resolveSiteMediaFolder(folder: string | undefined): string {
  const trimmed = folder?.trim();
  if (trimmed && SITE_MEDIA_ALLOWED_FOLDERS.has(trimmed)) return trimmed;
  return "blocks";
}

export function buildSiteMediaObjectKey(
  folder: string,
  filename: string,
  now: number = Date.now()
): string {
  return `site/${folder}/${now}-${filename}`;
}

export type SiteMediaUploadUrlSuccess = {
  ok: true;
  url: string;
  headers: Record<string, string>;
  key: string;
  publicUrl: string;
};
