/**
 * Platform content domain types (Phase 5A).
 * Neutral references and DTOs for cross-tenant content operations only.
 * Domain models (WorkProject, HubProject, BlogPost JSON, etc.) stay in their modules.
 */

import type { TenantSlug } from "@/lib/platform/tenants/types";
import { isTenantSlug, parseTenantSlug } from "@/lib/platform/tenants/types";

/** Stable public lifecycle labels — maps from domain-specific enums at adapter boundaries. */
export const CONTENT_LIFECYCLE_STATES = ["draft", "published", "archived"] as const;
export type ContentLifecycleState = (typeof CONTENT_LIFECYCLE_STATES)[number];

/** Per-target distribution for cross-published content (Studio Hub, journal sync). */
export const CONTENT_DISTRIBUTION_STATES = ["off", "draft", "live"] as const;
export type ContentDistributionState = (typeof CONTENT_DISTRIBUTION_STATES)[number];

/**
 * Known content type slugs for platform routing.
 * Not every Prisma table — only types that appear in cross-domain workflows or adapters.
 */
export const CONTENT_TYPES = [
  /** Dual-brand Studio Hub case study (Mirotech CMS; edited from Brightline admin). */
  "dual-brand-work",
  /** Dual-brand hub journal post (Mirotech CMS). */
  "dual-brand-journal",
  /** Brightline-native blog post with optional Mirotech journal sync. */
  "brightline-journal-sync",
  /** Brightline marketing work case study (WorkProject). */
  "work-project",
  /** Brightline Studio CMS project (StudioProject). */
  "studio-project",
  /** Brightline client delivery gallery. */
  "client-gallery",
  /** Legacy Brightline portfolio project. */
  "portfolio-project",
  /** Brightline design portfolio project. */
  "design-project",
  /** Brightline website page block CMS (SiteSetting). */
  "website-page",
  /** Brightline service page CMS (SiteSetting). */
  "service-page",
  /** Brightline blog/journal post (SiteSetting JSON). */
  "blog-post",
  /** Mirotech case study (Mirotech deploy DB — accessed via Content API). */
  "mirotech-case-study",
  /** Mirotech journal post (Mirotech deploy DB). */
  "mirotech-journal",
  /** Mirotech homepage CMS (Mirotech deploy only). */
  "mirotech-homepage",
  /** Mirotech static/site page (Mirotech deploy only). */
  "mirotech-site-page",
  /** Mirotech resume assets (R2 resume/ prefix). */
  "mirotech-resume",
] as const;

export type ContentType = (typeof CONTENT_TYPES)[number];

/** Content types owned by the Brightline deploy (local Prisma or SiteSetting). */
export const BRIGHTLINE_DOMAIN_CONTENT_TYPES = [
  "work-project",
  "studio-project",
  "client-gallery",
  "portfolio-project",
  "design-project",
  "website-page",
  "service-page",
  "blog-post",
  "brightline-journal-sync",
] as const satisfies readonly ContentType[];

/** Content types owned by the Mirotech deploy (HTTP API or handoff only from this repo). */
export const MIROTECH_DOMAIN_CONTENT_TYPES = [
  "mirotech-case-study",
  "mirotech-journal",
  "mirotech-homepage",
  "mirotech-site-page",
  "mirotech-resume",
] as const satisfies readonly ContentType[];

/** Types that span both brands via explicit publish/sync flags. */
export const CROSS_PUBLISHED_CONTENT_TYPES = [
  "dual-brand-work",
  "dual-brand-journal",
  "brightline-journal-sync",
] as const satisfies readonly ContentType[];

/**
 * Stable neutral reference — tenant is required; type + id alone are insufficient.
 * `id` is the authoritative key in the owning store (cuid, uuid, hub id, blog post id).
 */
export type ContentRef = {
  tenant: TenantSlug;
  type: ContentType;
  id: string;
};

/** @deprecated Phase 1A name — use ContentRef ({ tenant, type, id }). */
export type PlatformContentRef = {
  tenantSlug: TenantSlug;
  entityType: string;
  entityId: string;
};

/** Minimal metadata for cross-service linking (no full CMS body). */
export type ContentReferenceSummary = {
  ref: ContentRef;
  title: string;
  slug: string | null;
  lifecycle: ContentLifecycleState;
  publicPath: string | null;
  updatedAt: string | null;
  publishedAt: string | null;
};

/** Published read model — intentionally loose; adapters map domain shapes. */
export type ContentPublishedSnapshot = {
  ref: ContentRef;
  title: string;
  slug: string;
  lifecycle: ContentLifecycleState;
  publicPath: string | null;
  publishedAt: string | null;
  /** Adapter-specific payload for rendering; not a generic CMS document. */
  payload: unknown;
};

/** Cross-publish distribution when source record fans out to multiple tenants. */
export type ContentDistributionSnapshot = {
  ref: ContentRef;
  brightline: ContentDistributionState;
  mirotech: ContentDistributionState;
  journal: ContentDistributionState;
};

export function isContentType(value: unknown): value is ContentType {
  return typeof value === "string" && (CONTENT_TYPES as readonly string[]).includes(value);
}

export function parseContentType(value: unknown): ContentType | null {
  if (!isContentType(value)) return null;
  return value;
}

export function isContentRef(value: unknown): value is ContentRef {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    isTenantSlug(record.tenant) &&
    isContentType(record.type) &&
    typeof record.id === "string" &&
    record.id.trim().length > 0
  );
}

export function parseContentRef(value: unknown): ContentRef | null {
  if (!isContentRef(value)) return null;
  return {
    tenant: value.tenant,
    type: value.type,
    id: value.id.trim(),
  };
}

/** Reject refs missing tenant or with blank id — adapters must not resolve cross-tenant by type+id alone. */
export function assertValidContentRef(ref: ContentRef): ContentRef {
  if (!isTenantSlug(ref.tenant)) {
    throw new Error("ContentRef.tenant is required and must be a known tenant slug.");
  }
  if (!isContentType(ref.type)) {
    throw new Error("ContentRef.type is required and must be a known content type.");
  }
  const id = ref.id.trim();
  if (!id) {
    throw new Error("ContentRef.id is required.");
  }
  return { tenant: ref.tenant, type: ref.type, id };
}

export function contentRefKey(ref: ContentRef): string {
  const valid = assertValidContentRef(ref);
  return `${valid.tenant}:${valid.type}:${valid.id}`;
}

export function contentRefFromPlatformLegacy(legacy: PlatformContentRef): ContentRef | null {
  const tenant = parseTenantSlug(legacy.tenantSlug);
  const type = parseContentType(legacy.entityType);
  const id = legacy.entityId?.trim();
  if (!tenant || !type || !id) return null;
  return { tenant, type, id };
}

export function platformContentRefFromContentRef(ref: ContentRef): PlatformContentRef {
  const valid = assertValidContentRef(ref);
  return {
    tenantSlug: valid.tenant,
    entityType: valid.type,
    entityId: valid.id,
  };
}

export function tenantOwnsContentType(tenant: TenantSlug, type: ContentType): boolean {
  if ((CROSS_PUBLISHED_CONTENT_TYPES as readonly string[]).includes(type)) {
    return true;
  }
  if (tenant === "brightline") {
    return (BRIGHTLINE_DOMAIN_CONTENT_TYPES as readonly string[]).includes(type);
  }
  return (MIROTECH_DOMAIN_CONTENT_TYPES as readonly string[]).includes(type);
}

export function isCrossPublishedContentType(type: ContentType): boolean {
  return (CROSS_PUBLISHED_CONTENT_TYPES as readonly string[]).includes(type);
}
