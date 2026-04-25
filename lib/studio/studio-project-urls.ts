import { BRAND } from "@/lib/config/brand";

/** Site origin for Studio OS links (draft admin URL, public case study URL). */
export function getStudioSiteBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return BRAND.url.replace(/\/$/, "");
}

/** Public case study URL (`/work/[slug]`). Only meaningful when `published` is true. */
export function studioProjectLiveUrl(slug: string): string {
  const base = getStudioSiteBaseUrl();
  return `${base}/work/${encodeURIComponent(slug)}`;
}

/** Admin edit URL for automation feedback (Airtable “Draft URL”). */
export function studioProjectAdminEditUrl(projectId: string): string {
  const base = getStudioSiteBaseUrl();
  return `${base}/admin/projects/${projectId}/edit`;
}
