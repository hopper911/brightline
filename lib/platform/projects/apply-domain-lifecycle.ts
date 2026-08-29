import "server-only";

import type { ContentRef } from "@/lib/platform/content/types";
import { updateHubProject } from "@/lib/dual-brand/studio-hub";
import type { ProjectWorkflowLifecycle } from "@/lib/platform/projects/types";
import { prisma } from "@/lib/prisma";

export async function applyDomainLifecycleForTransition(
  ref: ContentRef,
  from: ProjectWorkflowLifecycle,
  to: ProjectWorkflowLifecycle
): Promise<void> {
  if (ref.type === "work-project" && ref.tenant === "brightline") {
    if (to === "PUBLISHED") {
      await prisma.workProject.update({
        where: { id: ref.id },
        data: { published: true },
      });
    }
    return;
  }

  if (ref.type === "mirotech-case-study" && ref.tenant === "mirotech") {
    let hubStatus: string | null = null;
    if (to === "IN_REVIEW") hubStatus = "REVIEW";
    else if (to === "PUBLISHED") hubStatus = "PUBLISHED";
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
