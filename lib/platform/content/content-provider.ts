/**
 * Tenant content provider adapter contract (Phase 5A — interfaces only).
 * Implementations wrap legacy modules (Prisma queries, dual-brand HTTP clients).
 */

import type { PlatformContext } from "@/lib/platform/context/types";
import type { TenantSlug } from "@/lib/platform/tenants/types";
import type {
  ContentDistributionSnapshot,
  ContentListResult,
  ContentPublishedSnapshot,
  ContentRef,
  ContentReferenceSummary,
  ContentType,
} from "@/lib/platform/content/types";

/**
 * Adapter for one tenant's content stores.
 * BrightlineContentProvider → Prisma + SiteSetting modules.
 * MiroTechContentProvider → Content API + Studio Hub HTTP client.
 */
export interface ContentProvider {
  readonly tenant: TenantSlug;

  /** Whether this adapter handles the given ref (tenant + type must match). */
  supports(ref: ContentRef): boolean;

  /** Neutral metadata for linking, audit, and admin cross-references. */
  resolveReference(
    context: PlatformContext,
    ref: ContentRef
  ): Promise<ContentReferenceSummary | null>;

  /** Published snapshot for public or cross-tenant read paths. */
  getPublished(
    context: PlatformContext,
    ref: ContentRef
  ): Promise<ContentPublishedSnapshot | null>;

  /**
   * Distribution across brands when the backing record supports cross-publish.
   * Default: return null for domain-only types.
   */
  getDistribution?(
    context: PlatformContext,
    ref: ContentRef
  ): Promise<ContentDistributionSnapshot | null>;

  /** List content summaries for adapter-supported types (Studio / admin pickers). */
  listPublished?(
    context: PlatformContext,
    type: ContentType,
    options?: { limit?: number; cursor?: string }
  ): Promise<ContentListResult>;
}

/** Planned adapter mapping (not implemented in 5A). */
export type ContentProviderKind = "brightline" | "mirotech";

export type ContentProviderRegistry = {
  getProvider(tenant: TenantSlug): ContentProvider | null;
  listProviders(): ContentProvider[];
};
