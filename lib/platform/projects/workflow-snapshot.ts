import "server-only";

import type { ContentRef } from "@/lib/platform/content/types";
import { getHubProject } from "@/lib/dual-brand/studio-hub";
import type { ProjectWorkflowCompletenessInput } from "@/lib/platform/projects/project-workflow-service";
import { ProjectWorkflowValidationError } from "@/lib/platform/projects/errors";
import { getStoredProjectWorkflowState } from "@/lib/platform/projects/workflow-state";
import { prisma } from "@/lib/prisma";

export type ProjectWorkflowSnapshotContext = ProjectWorkflowCompletenessInput & {
  published: boolean;
};

export async function loadProjectWorkflowSnapshot(
  ref: ContentRef
): Promise<ProjectWorkflowSnapshotContext> {
  if (ref.type === "work-project" && ref.tenant === "brightline") {
    const row = await prisma.workProject.findUnique({
      where: { id: ref.id },
      include: {
        heroMedia: true,
        media: { include: { media: true } },
      },
    });
    if (!row) throw new ProjectWorkflowValidationError("Project not found.");
    return {
      tenant: "brightline",
      kind: "work-project",
      published: row.published,
      snapshot: {
        title: row.title,
        slug: row.slug,
        section: row.section,
        summary: row.summary,
        description: row.description,
        heroMediaId: row.heroMediaId,
        mediaCount: row.media.length,
        seoTitle: row.seoTitle,
        metaDescription: row.metaDescription,
        heroKeyFull: row.heroMedia?.keyFull ?? null,
        published: row.published,
      },
    };
  }

  if (ref.type === "mirotech-case-study" && ref.tenant === "mirotech") {
    const project = await getHubProject(ref.id);
    if (!project) throw new ProjectWorkflowValidationError("Project not found.");
    const stored = await getStoredProjectWorkflowState(ref);
    const published = String(project.status).toUpperCase() === "PUBLISHED";
    const sectionTitles =
      project.sections?.map((s) => (s.title ?? "").trim()).filter(Boolean) ?? [];
    return {
      tenant: "mirotech",
      kind: "mirotech-case-study",
      published,
      snapshot: {
        title: project.title,
        slug: project.slug,
        summary: project.summary ?? "",
        status: project.status ?? "DRAFT",
        heroImage: project.heroImage ?? null,
        thumbnailImage: project.thumbnailImage ?? null,
        sectionCount: project.sections?.length ?? 0,
        challenge: project.challenge ?? null,
        outcome: project.outcome ?? null,
        role: project.role ?? null,
        projectDisclaimer: project.projectDisclaimer ?? null,
        sectionTitles,
        seoTitle: project.seoTitle ?? null,
        seoDescription: project.seoDescription ?? null,
        publishMirotech: project.publishMirotech ?? false,
        templateId: stored?.templateId ?? null,
      },
    };
  }

  throw new ProjectWorkflowValidationError("Unsupported project type.");
}
