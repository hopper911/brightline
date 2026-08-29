import "server-only";

import type { HubJournalPost, HubJournalSummary, HubProject } from "@/lib/dual-brand/studio-hub";
import { updateHubBlog, updateHubProject } from "@/lib/dual-brand/studio-hub";
import { recordAuditSafely } from "@/lib/platform/audit/record-safely";
import type { PlatformAuditActor } from "@/lib/platform/audit/types";
import { createPlatformContextForTenant } from "@/lib/platform/context/types";
import { isPlatformFeatureEnabled } from "@/lib/platform/features";
import type { DefaultPublishingService } from "@/lib/platform/publishing/default-publishing-service";
import { defaultPublishingService } from "@/lib/platform/publishing/default-publishing-service";
import { isPublishingError } from "@/lib/platform/publishing/errors";
import { assertProjectPublishAllowed } from "@/lib/platform/projects/publish-gate";
import {
  enqueueStudioHubBlogPatchJob,
  enqueueStudioHubProjectPatchJob,
} from "@/lib/platform/publishing/integrations/studio-hub-async-publish";
import { isPlatformPublishingJobsAsync } from "@/lib/platform/publishing/is-async-publishing-jobs";
import type { AsyncPublishAccepted } from "@/lib/platform/publishing/async-publish-types";

const MIROTECH_TARGET = "mirotech-site" as const;

async function auditHubPublish(
  actor: PlatformAuditActor,
  resourceType: string,
  resourceId: string,
  action: "publishing.started" | "publishing.completed" | "publishing.failed",
  metadata?: Record<string, unknown>
): Promise<void> {
  const context = createPlatformContextForTenant("mirotech");
  await recordAuditSafely({
    context,
    actor,
    action,
    resource: { type: resourceType, id: resourceId },
    metadata: { target: MIROTECH_TARGET, ...metadata },
  });
}

/** Legacy hub project PATCH (pre-PublishingService). */
export async function legacyPatchStudioHubProject(
  id: string,
  payload: Record<string, unknown>
): Promise<HubProject> {
  return updateHubProject(id, payload);
}

/** Platform hub project PATCH via PublishingService (Phase 6D). */
export async function platformPatchStudioHubProject(
  id: string,
  payload: Record<string, unknown>,
  publishingService: DefaultPublishingService = defaultPublishingService,
  actor: PlatformAuditActor = { type: "SYSTEM" }
): Promise<HubProject> {
  const request = {
    source: { tenant: "mirotech" as const, type: "dual-brand-work" as const, id },
    target: MIROTECH_TARGET,
    operation: "sync" as const,
    hubPatch: payload,
  };

  await auditHubPublish(actor, "dual-brand-work", id, "publishing.started", {
    operation: "sync",
  });

  try {
    const result = await publishingService.publish(createPlatformContextForTenant("mirotech"), request);
    if (result.outcome !== "completed" || !result.hubProject) {
      await auditHubPublish(actor, "dual-brand-work", id, "publishing.failed", {
        error: result.message ?? "Hub project publish failed",
      });
      throw new Error(result.message ?? "Hub project publish failed");
    }
    await auditHubPublish(actor, "dual-brand-work", id, "publishing.completed", {
      resourceId: result.resourceId ?? id,
    });
    return result.hubProject as unknown as HubProject;
  } catch (error) {
    if (!(error instanceof Error && error.message.includes("Hub project publish failed"))) {
      await auditHubPublish(actor, "dual-brand-work", id, "publishing.failed", {
        error: isPublishingError(error) ? error.message : "Hub project publish failed",
      });
    }
    throw error;
  }
}

export async function resolveStudioHubProjectPatch(
  id: string,
  payload: Record<string, unknown>,
  options?: { publishingService?: DefaultPublishingService; actor?: PlatformAuditActor }
): Promise<HubProject | AsyncPublishAccepted> {
  const status = payload.status;
  if (String(status ?? "").toUpperCase() === "PUBLISHED") {
    await assertProjectPublishAllowed({
      tenant: "mirotech",
      type: "mirotech-case-study",
      id,
    });
  }

  if (!isPlatformFeatureEnabled("publishing")) {
    return legacyPatchStudioHubProject(id, payload);
  }
  if (isPlatformPublishingJobsAsync()) {
    return enqueueStudioHubProjectPatchJob(id, payload, { actor: options?.actor });
  }
  return platformPatchStudioHubProject(id, payload, options?.publishingService, options?.actor);
}

/** Legacy hub journal PATCH. */
export async function legacyPatchStudioHubBlog(
  projectId: string,
  payload: Record<string, unknown>
): Promise<{ post: HubJournalPost; summary: HubJournalSummary }> {
  return updateHubBlog(projectId, payload);
}

/** Platform hub journal PATCH via PublishingService. */
export async function platformPatchStudioHubBlog(
  projectId: string,
  payload: Record<string, unknown>,
  publishingService: DefaultPublishingService = defaultPublishingService,
  actor: PlatformAuditActor = { type: "SYSTEM" }
): Promise<{ post: HubJournalPost; summary: HubJournalSummary }> {
  const request = {
    source: { tenant: "mirotech" as const, type: "dual-brand-journal" as const, id: projectId },
    target: MIROTECH_TARGET,
    operation: "sync" as const,
    hubPatch: payload,
  };

  await auditHubPublish(actor, "dual-brand-journal", projectId, "publishing.started", {
    operation: "sync",
  });

  try {
    const result = await publishingService.publish(createPlatformContextForTenant("mirotech"), request);
    if (result.outcome !== "completed" || !result.hubBlog) {
      await auditHubPublish(actor, "dual-brand-journal", projectId, "publishing.failed", {
        error: result.message ?? "Hub blog publish failed",
      });
      throw new Error(result.message ?? "Hub blog publish failed");
    }
    await auditHubPublish(actor, "dual-brand-journal", projectId, "publishing.completed", {
      resourceId: result.resourceId ?? projectId,
    });
    return {
      post: result.hubBlog.post as unknown as HubJournalPost,
      summary: result.hubBlog.summary as unknown as HubJournalSummary,
    };
  } catch (error) {
    if (!(error instanceof Error && error.message.includes("Hub blog publish failed"))) {
      await auditHubPublish(actor, "dual-brand-journal", projectId, "publishing.failed", {
        error: isPublishingError(error) ? error.message : "Hub blog publish failed",
      });
    }
    throw error;
  }
}

export async function resolveStudioHubBlogPatch(
  projectId: string,
  payload: Record<string, unknown>,
  options?: { publishingService?: DefaultPublishingService; actor?: PlatformAuditActor }
): Promise<
  | { post: HubJournalPost; summary: HubJournalSummary }
  | AsyncPublishAccepted
> {
  if (!isPlatformFeatureEnabled("publishing")) {
    return legacyPatchStudioHubBlog(projectId, payload);
  }
  if (isPlatformPublishingJobsAsync()) {
    return enqueueStudioHubBlogPatchJob(projectId, payload, { actor: options?.actor });
  }
  return platformPatchStudioHubBlog(projectId, payload, options?.publishingService, options?.actor);
}
