/**
 * Application-facing content boundary (Phase 5A contract — no default implementation).
 * Cross-domain reads and distribution only; domain CRUD stays in existing modules.
 * Flag: PLATFORM_CONTENT_ENABLED (default off) — future DefaultContentService in 5B+.
 */

import type { PlatformContext } from "@/lib/platform/context/types";
import type {
  ContentDistributionSnapshot,
  ContentPublishedSnapshot,
  ContentRef,
  ContentReferenceSummary,
  ContentType,
} from "@/lib/platform/content/types";

/**
 * Platform content service — NOT a universal CMS over every table.
 * Methods represent domain intentions justified by current cross-brand workflows:
 * - dual-brand work/journal reads (`lib/dual-brand/content-api.ts`)
 * - Studio Hub distribution status (`lib/dual-brand/studio-hub.ts`)
 * - Brightline journal → Mirotech sync metadata (`lib/dual-brand/sync-journal.ts`)
 */
export interface ContentService {
  /**
   * Resolve stable metadata for a ContentRef without returning full CMS bodies.
   * Used for cross-service linking, admin pickers, and audit resource ids.
   */
  resolveReference(
    context: PlatformContext,
    ref: ContentRef
  ): Promise<ContentReferenceSummary | null>;

  /**
   * Read a published snapshot when the ref is live on the requested tenant surface.
   * Wraps Content API reads and local Prisma public queries — not arbitrary model fetch.
   */
  getPublished(context: PlatformContext, ref: ContentRef): Promise<ContentPublishedSnapshot | null>;

  /**
   * Cross-publish distribution (Brightline vs Mirotech vs journal) when applicable.
   * Returns null for domain-only content types.
   */
  getDistribution(
    context: PlatformContext,
    ref: ContentRef
  ): Promise<ContentDistributionSnapshot | null>;

  /**
   * List published refs of a cross-domain type for a tenant (e.g. dual-brand work on /work).
   * Optional — implement when migrating public listing routes behind the service.
   */
  listPublished?(
    context: PlatformContext,
    type: ContentType,
    options?: { limit?: number; cursor?: string }
  ): Promise<ContentReferenceSummary[]>;
}

/** Alias aligned with Phase 1A service boundary naming. */
export type PlatformContentService = ContentService;
