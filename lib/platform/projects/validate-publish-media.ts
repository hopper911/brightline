import "server-only";

import type { ContentRef } from "@/lib/platform/content/types";
import { ProjectWorkflowValidationError } from "@/lib/platform/projects/errors";
import { prisma } from "@/lib/prisma";

export type ProjectPublishMediaValidation = {
  valid: boolean;
  missing: string[];
};

export async function validateProjectPublishMedia(
  ref: ContentRef
): Promise<ProjectPublishMediaValidation> {
  if (ref.type === "work-project" && ref.tenant === "brightline") {
    const project = await prisma.workProject.findUnique({
      where: { id: ref.id },
      include: {
        heroMedia: true,
        media: { include: { media: true } },
      },
    });
    if (!project) {
      throw new ProjectWorkflowValidationError("Project not found.");
    }

    const missing: string[] = [];
    const heroKey = project.heroMedia?.keyFull ?? project.heroMedia?.keyThumb ?? null;
    if (!project.heroMediaId || !heroKey?.trim()) {
      missing.push("hero asset key");
    }

    for (const row of project.media) {
      const key = row.media.keyFull ?? row.media.keyThumb ?? null;
      if (!key?.trim()) {
        missing.push(`gallery media ${row.mediaId} missing asset key`);
      }
    }

    return { valid: missing.length === 0, missing };
  }

  if (ref.type === "mirotech-case-study" && ref.tenant === "mirotech") {
    const { getHubProject } = await import("@/lib/dual-brand/studio-hub");
    const project = await getHubProject(ref.id);
    if (!project) {
      throw new ProjectWorkflowValidationError("Project not found.");
    }

    const missing: string[] = [];
    if (!project.heroImage?.trim()) {
      missing.push("hero image key");
    }
    if (project.thumbnailImage && !project.thumbnailImage.trim()) {
      missing.push("thumbnail image key");
    }

    return { valid: missing.length === 0, missing };
  }

  throw new ProjectWorkflowValidationError("Unsupported project type for media validation.");
}

export async function assertProjectPublishMediaValid(ref: ContentRef): Promise<void> {
  const result = await validateProjectPublishMedia(ref);
  if (!result.valid) {
    throw new ProjectWorkflowValidationError(
      `Required publish media is invalid. Missing: ${result.missing.join(", ")}.`
    );
  }
}
