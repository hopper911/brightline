/**
 * Publishing platform types (Phase 6A contract — no default implementation).
 * PublishingService answers "how does approved content become live?" — separate from ContentService reads.
 */

import type { ContentRef } from "@/lib/platform/content/types";
import type { TenantSlug } from "@/lib/platform/tenants/types";

/** Live surfaces content can be published to (matches actual deploy topology). */
export const PUBLISH_TARGETS = ["brightline-site", "mirotech-site"] as const;

export type PublishTargetId = (typeof PUBLISH_TARGETS)[number];

/** Maps publish target to platform tenant slug. */
export const PUBLISH_TARGET_TENANT: Readonly<Record<PublishTargetId, TenantSlug>> = Object.freeze({
  "brightline-site": "brightline",
  "mirotech-site": "mirotech",
});

export function isPublishTargetId(value: string): value is PublishTargetId {
  return (PUBLISH_TARGETS as readonly string[]).includes(value);
}

export function publishTargetForTenant(tenant: TenantSlug): PublishTargetId {
  return tenant === "mirotech" ? "mirotech-site" : "brightline-site";
}

/** Neutral publish intent — not a database operation name. */
export const PUBLISH_OPERATIONS = ["publish", "unpublish", "sync"] as const;

export type PublishOperation = (typeof PUBLISH_OPERATIONS)[number];

export function isPublishOperation(value: string): value is PublishOperation {
  return (PUBLISH_OPERATIONS as readonly string[]).includes(value);
}

/**
 * Synchronous publish outcome (Phase 6A).
 * `accepted` reserved for future async handoff (Phase 7); unused until jobs exist.
 */
export const PUBLISH_OUTCOMES = ["completed", "accepted", "failed"] as const;

export type PublishOutcome = (typeof PUBLISH_OUTCOMES)[number];

/** Optional side-effect hints for operators/debugging — not an audit log. */
export type PublishEffect =
  | { kind: "database_updated"; description: string }
  | { kind: "cache_revalidated"; paths: string[] }
  | { kind: "remote_api"; target: PublishTargetId; path: string; status: number };

/**
 * Neutral publish request.
 * - `source`: authoritative content identity (ContentRef from Phase 5)
 * - `target`: destination live surface
 * - `operation`: publish | unpublish | sync (cross-site push without local lifecycle change)
 */
export type PublishRequest = {
  source: ContentRef;
  target: PublishTargetId;
  operation: PublishOperation;
};

export type PublishResult = {
  outcome: PublishOutcome;
  request: PublishRequest;
  /** Id of the resource on the publish target (e.g. Mirotech journal id). */
  resourceId?: string | null;
  /** Human-readable summary for admin UI (future). */
  message?: string;
  /** Non-fatal partial failures (e.g. local save ok, remote sync failed). */
  warnings?: string[];
  /** Observed side effects when adapter reports them. */
  effects?: PublishEffect[];
  /** Stable error code when outcome is failed. */
  errorCode?: PublishErrorCode;
};

export type PublishErrorCode =
  | "not_found"
  | "not_configured"
  | "unsupported"
  | "unauthorized"
  | "validation"
  | "remote_failed"
  | "partial_failure";

export function assertValidPublishRequest(input: PublishRequest): PublishRequest {
  if (!input?.source || typeof input.source !== "object") {
    throw new Error("PublishRequest.source is required.");
  }
  if (!isPublishTargetId(input.target)) {
    throw new Error(`Invalid publish target: ${String(input.target)}`);
  }
  if (!isPublishOperation(input.operation)) {
    throw new Error(`Invalid publish operation: ${String(input.operation)}`);
  }
  return input;
}

/** @deprecated Phase 1A sketch — use PublishTargetId + PublishRequest. */
export type PlatformPublishTarget = {
  tenantSlug: TenantSlug;
  entityType: string;
  entityId: string;
};

export function publishRequestFromLegacyTarget(
  target: PlatformPublishTarget,
  operation: PublishOperation = "publish"
): PublishRequest {
  return {
    source: {
      tenant: target.tenantSlug,
      type: target.entityType as PublishRequest["source"]["type"],
      id: target.entityId,
    },
    target: publishTargetForTenant(target.tenantSlug),
    operation,
  };
}
