/**
 * Future platform service boundaries — types only (Phase 1A).
 * Implementations wrap legacy code in later phases; nothing routes here yet.
 *
 * Publishing types moved to lib/platform/publishing/ (Phase 6A).
 */

import type { TenantSlug } from "@/lib/platform/tenants";
import type {
  RecordPlatformAuditInput,
  RecordPlatformAuditResult,
} from "@/lib/platform/audit/types";
export type { MediaService as PlatformMediaService } from "@/lib/platform/media/media-service";
export type {
  MediaObjectRef,
  PlatformMediaAssetRef,
} from "@/lib/platform/media/types";

/** @deprecated Use PlatformMediaAssetRef — Phase 1A shape kept for transitional imports. */
export type PlatformAssetRef = {
  tenantSlug: TenantSlug;
  objectKey: string;
  vault?: "brightline" | "mirotech-site";
};

/** @deprecated Superseded by MediaUploadRequest / createDownloadUrl in MediaService (Phase 3A). */
export type PlatformSignedUrlOptions = {
  tenantSlug: TenantSlug;
  objectKey: string;
  expiresInSeconds?: number;
};

export type {
  ContentRef,
  PlatformContentRef,
} from "@/lib/platform/content/types";
export type { ContentService, PlatformContentService } from "@/lib/platform/content/content-service";

export type {
  PlatformPublishTarget,
  PlatformPublishingService,
  PublishRequest,
  PublishResult,
  PublishingService,
} from "@/lib/platform/publishing";
export type {
  EnqueueJobInput,
  EnqueueJobResult,
  JobPayload,
  JobRecord,
  JobStatus,
  PlatformJobService,
  JobService,
} from "@/lib/platform/jobs";
export type {
  IdentityService,
  LegacyIdentityInput,
  PlatformIdentityService,
  PlatformMembershipRecord,
  PlatformMembershipRole,
  PlatformUserRecord,
  PlatformUserStatus,
} from "@/lib/platform/identity";

/** Operational audit trail (implementation: `platformAuditService`). */
export interface PlatformAuditService {
  record(input: RecordPlatformAuditInput): Promise<RecordPlatformAuditResult>;
}
