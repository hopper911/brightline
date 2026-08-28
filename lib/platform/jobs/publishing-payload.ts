/**
 * Publishing job payload types and idempotency helpers (Phase 7B).
 */

import { createHash } from "node:crypto";

import type { ContentRef } from "@/lib/platform/content/types";
import { assertValidContentRef } from "@/lib/platform/content/types";
import type { PlatformAuditActor } from "@/lib/platform/audit/types";
import { isPlatformAuditActorType } from "@/lib/platform/audit/types";
import { JobPayloadError } from "@/lib/platform/jobs/errors";
import {
  PUBLISHING_MIROTECH_HUB_PATCH_JOB,
  PUBLISHING_MIROTECH_JOURNAL_SYNC_JOB,
  type JobPayload,
} from "@/lib/platform/jobs/types";
import {
  isPublishOperation,
  isPublishTargetId,
  type PublishOperation,
  type PublishTargetId,
} from "@/lib/platform/publishing/types";

export type PublishingJobResult = {
  ok: boolean;
  resourceId?: string | null;
  error?: string;
  /** Hub project body returned from Mirotech CMS write (hub patch jobs). */
  hubProject?: Record<string, unknown>;
};

export type PublishingMirotechJournalSyncPayload = {
  source: ContentRef;
  target: PublishTargetId;
  operation: PublishOperation;
  /** Blog post `updatedAt` — new saves get a new idempotency key. */
  contentVersion: string;
  actor: PlatformAuditActor;
  result?: PublishingJobResult;
};

export type PublishingMirotechHubPatchPayload = {
  source: ContentRef;
  target: PublishTargetId;
  operation: PublishOperation;
  /** Stable hash of sanitized hub PATCH body. */
  contentVersion: string;
  hubPatch: Record<string, unknown>;
  actor: PlatformAuditActor;
  result?: PublishingJobResult;
};

export const MAX_PUBLISHING_JOB_ATTEMPTS = 3;

export function hashPublishingContentVersion(value: unknown): string {
  const serialized = JSON.stringify(value ?? {});
  return createHash("sha256").update(serialized).digest("hex").slice(0, 32);
}

export function buildPublishingMirotechJournalIdempotencyKey(input: {
  source: ContentRef;
  target: PublishTargetId;
  operation: PublishOperation;
  contentVersion: string;
}): string {
  const source = assertValidContentRef(input.source);
  return [
    PUBLISHING_MIROTECH_JOURNAL_SYNC_JOB,
    source.tenant,
    source.type,
    source.id,
    input.target,
    input.operation,
    input.contentVersion.trim(),
  ].join(":");
}

export function parsePublishingMirotechJournalSyncPayload(
  payload: JobPayload
): PublishingMirotechJournalSyncPayload {
  const sourceRaw = payload.source;
  if (!sourceRaw || typeof sourceRaw !== "object" || Array.isArray(sourceRaw)) {
    throw new JobPayloadError("Publishing job payload missing source ContentRef.");
  }
  const source = assertValidContentRef(sourceRaw as ContentRef);
  if (source.type !== "blog-post" || source.tenant !== "brightline") {
    throw new JobPayloadError("Publishing Mirotech journal sync requires brightline blog-post source.");
  }

  const target = payload.target;
  if (typeof target !== "string" || !isPublishTargetId(target)) {
    throw new JobPayloadError("Publishing job payload missing valid target.");
  }

  const operation = payload.operation;
  if (typeof operation !== "string" || !isPublishOperation(operation)) {
    throw new JobPayloadError("Publishing job payload missing valid operation.");
  }

  const contentVersion = payload.contentVersion;
  if (typeof contentVersion !== "string" || !contentVersion.trim()) {
    throw new JobPayloadError("Publishing job payload missing contentVersion.");
  }

  const actorRaw = payload.actor;
  if (!actorRaw || typeof actorRaw !== "object" || Array.isArray(actorRaw)) {
    throw new JobPayloadError("Publishing job payload missing actor.");
  }
  const actorType = (actorRaw as PlatformAuditActor).type;
  if (!isPlatformAuditActorType(actorType)) {
    throw new JobPayloadError("Publishing job payload has invalid actor type.");
  }

  const actor: PlatformAuditActor = {
    type: actorType,
    id:
      typeof (actorRaw as PlatformAuditActor).id === "string"
        ? (actorRaw as PlatformAuditActor).id
        : null,
  };

  const resultRaw = payload.result;
  let result: PublishingJobResult | undefined;
  if (resultRaw && typeof resultRaw === "object" && !Array.isArray(resultRaw)) {
    const ok = (resultRaw as PublishingJobResult).ok;
    if (typeof ok === "boolean") {
      result = {
        ok,
        resourceId:
          typeof (resultRaw as PublishingJobResult).resourceId === "string"
            ? (resultRaw as PublishingJobResult).resourceId
            : null,
        error:
          typeof (resultRaw as PublishingJobResult).error === "string"
            ? (resultRaw as PublishingJobResult).error
            : undefined,
      };
    }
  }

  return {
    source,
    target,
    operation,
    contentVersion: contentVersion.trim(),
    actor,
    result,
  };
}

export function publishingJobPayload(input: {
  source: ContentRef;
  target: PublishTargetId;
  operation: PublishOperation;
  contentVersion: string;
  actor: PlatformAuditActor;
}): JobPayload {
  return {
    source: assertValidContentRef(input.source),
    target: input.target,
    operation: input.operation,
    contentVersion: input.contentVersion.trim(),
    actor: {
      type: input.actor.type,
      ...(input.actor.id ? { id: input.actor.id } : {}),
    },
  };
}

export function buildPublishingMirotechHubPatchIdempotencyKey(input: {
  source: ContentRef;
  target: PublishTargetId;
  operation: PublishOperation;
  contentVersion: string;
}): string {
  const source = assertValidContentRef(input.source);
  return [
    PUBLISHING_MIROTECH_HUB_PATCH_JOB,
    source.tenant,
    source.type,
    source.id,
    input.target,
    input.operation,
    input.contentVersion.trim(),
  ].join(":");
}

export function parsePublishingMirotechHubPatchPayload(
  payload: JobPayload
): PublishingMirotechHubPatchPayload {
  const sourceRaw = payload.source;
  if (!sourceRaw || typeof sourceRaw !== "object" || Array.isArray(sourceRaw)) {
    throw new JobPayloadError("Hub patch job payload missing source ContentRef.");
  }
  const source = assertValidContentRef(sourceRaw as ContentRef);
  if (source.type !== "dual-brand-work" || source.tenant !== "mirotech") {
    throw new JobPayloadError("Hub patch job requires mirotech dual-brand-work source.");
  }

  const target = payload.target;
  if (typeof target !== "string" || !isPublishTargetId(target)) {
    throw new JobPayloadError("Hub patch job payload missing valid target.");
  }

  const operation = payload.operation;
  if (typeof operation !== "string" || !isPublishOperation(operation)) {
    throw new JobPayloadError("Hub patch job payload missing valid operation.");
  }

  const contentVersion = payload.contentVersion;
  if (typeof contentVersion !== "string" || !contentVersion.trim()) {
    throw new JobPayloadError("Hub patch job payload missing contentVersion.");
  }

  const hubPatchRaw = payload.hubPatch;
  if (!hubPatchRaw || typeof hubPatchRaw !== "object" || Array.isArray(hubPatchRaw)) {
    throw new JobPayloadError("Hub patch job payload missing hubPatch object.");
  }

  const actorRaw = payload.actor;
  if (!actorRaw || typeof actorRaw !== "object" || Array.isArray(actorRaw)) {
    throw new JobPayloadError("Hub patch job payload missing actor.");
  }
  const actorType = (actorRaw as PlatformAuditActor).type;
  if (!isPlatformAuditActorType(actorType)) {
    throw new JobPayloadError("Hub patch job payload has invalid actor type.");
  }

  const actor: PlatformAuditActor = {
    type: actorType,
    id:
      typeof (actorRaw as PlatformAuditActor).id === "string"
        ? (actorRaw as PlatformAuditActor).id
        : null,
  };

  const result = readPublishingJobResult(payload) ?? undefined;

  return {
    source,
    target,
    operation,
    contentVersion: contentVersion.trim(),
    hubPatch: hubPatchRaw as Record<string, unknown>,
    actor,
    result,
  };
}

export function publishingHubPatchJobPayload(input: {
  source: ContentRef;
  target: PublishTargetId;
  operation: PublishOperation;
  contentVersion: string;
  hubPatch: Record<string, unknown>;
  actor: PlatformAuditActor;
}): JobPayload {
  return {
    ...publishingJobPayload(input),
    hubPatch: input.hubPatch,
  };
}

export function readPublishingJobResult(payload: JobPayload): PublishingJobResult | null {
  const resultRaw = payload.result;
  if (resultRaw && typeof resultRaw === "object" && !Array.isArray(resultRaw)) {
    const ok = (resultRaw as PublishingJobResult).ok;
    if (typeof ok === "boolean") {
      const hubProjectRaw = (resultRaw as PublishingJobResult).hubProject;
      return {
        ok,
        resourceId:
          typeof (resultRaw as PublishingJobResult).resourceId === "string"
            ? (resultRaw as PublishingJobResult).resourceId
            : null,
        error:
          typeof (resultRaw as PublishingJobResult).error === "string"
            ? (resultRaw as PublishingJobResult).error
            : undefined,
        hubProject:
          hubProjectRaw && typeof hubProjectRaw === "object" && !Array.isArray(hubProjectRaw)
            ? (hubProjectRaw as Record<string, unknown>)
            : undefined,
      };
    }
  }

  try {
    return parsePublishingMirotechJournalSyncPayload(payload).result ?? null;
  } catch {
    try {
      return parsePublishingMirotechHubPatchPayload(payload).result ?? null;
    } catch {
      return null;
    }
  }
}
