import "server-only";

import type { ContentRef } from "@/lib/platform/content/types";
import { updateHubProject } from "@/lib/dual-brand/studio-hub";
import type { ProjectWorkflowLifecycle } from "@/lib/platform/projects/types";

/**
 * Applies non-publish lifecycle transitions to domain stores.
 * PUBLISHED is handled exclusively by project-publish-service + PublishingService.
 */
export async function applyDomainLifecycleForTransition(
  ref: ContentRef,
  from: ProjectWorkflowLifecycle,
  to: ProjectWorkflowLifecycle
): Promise<void> {
  if (ref.type === "work-project" && ref.tenant === "brightline") {
    return;
  }

  if (ref.type === "mirotech-case-study" && ref.tenant === "mirotech") {
    let hubStatus: string | null = null;
    if (to === "IN_REVIEW") hubStatus = "REVIEW";
    else if (
      (to === "MEDIA_READY" || to === "CONTENT_READY" || to === "DRAFT") &&
      (from === "IN_REVIEW" || from === "APPROVED")
    ) {
      hubStatus = "DRAFT";
    }

    if (hubStatus) {
      await updateHubProject(ref.id, { status: hubStatus });
    }
  }
}
