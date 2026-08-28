/**
 * Application-facing publishing boundary (Phase 6A contract — no default implementation).
 *
 * ContentService: "What is the content?"
 * PublishingService: "How does approved content become live?"
 *
 * Flag: PLATFORM_PUBLISHING_ENABLED (default off) — future DefaultPublishingService in 6B+.
 */

import type { PlatformContext } from "@/lib/platform/context/types";
import type { PublishRequest, PublishResult } from "@/lib/platform/publishing/types";

/**
 * Platform publishing service — NOT a universal "deploy" button.
 *
 * Methods represent domain intentions justified by current workflows:
 * - Brightline Prisma/SiteSetting publish toggles + revalidatePath
 * - Studio Hub HTTP writes (`lib/dual-brand/studio-hub.ts`)
 * - Blog → Mirotech journal sync (`lib/dual-brand/sync-journal.ts`)
 *
 * Phase 6A: contract only. Legacy admin routes remain authoritative.
 *
 * **No getStatus / jobId in Phase 6A** — all observed publish paths are synchronous.
 * Phase 7 may add `submitPublish` → job queue; defer until background jobs land.
 */
export interface PublishingService {
  /**
   * Make content live, take it offline, or push to a cross-site target (sync).
   * Returns synchronously with completed | failed (accepted reserved for future async).
   */
  publish(context: PlatformContext, request: PublishRequest): Promise<PublishResult>;
}

/** Alias aligned with Phase 1A service boundary naming. */
export type PlatformPublishingService = PublishingService;
