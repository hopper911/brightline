/**
 * Future platform service boundaries — types only (Phase 1A).
 * Implementations wrap legacy code in later phases; nothing routes here yet.
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

export type PlatformContentRef = {
  tenantSlug: TenantSlug;
  entityType: string;
  entityId: string;
};

/** Future ContentService — neutral read/write for cross-tenant content. */
export interface PlatformContentService {
  getPublished(ref: PlatformContentRef): Promise<unknown | null>;
}

export type PlatformPublishTarget = {
  tenantSlug: TenantSlug;
  entityType: string;
  entityId: string;
};

/** Future PublishingService — wraps Studio Hub / Work publish paths. */
export interface PlatformPublishingService {
  publish(target: PlatformPublishTarget): Promise<{ jobId: string }>;
  getJobStatus(jobId: string): Promise<{ status: "pending" | "completed" | "failed"; error?: string }>;
}

/** Operational audit trail (implementation: `platformAuditService`). */
export interface PlatformAuditService {
  record(input: RecordPlatformAuditInput): Promise<RecordPlatformAuditResult>;
}
