import "server-only";

import type { HubProject } from "@/lib/dual-brand/studio-hub";
import { defaultMirotechContentReadPort } from "@/lib/platform/content/integrations/default-mirotech-content-read";
import { ProjectWorkflowValidationError } from "@/lib/platform/projects/errors";
import { resolveProjectSlug } from "@/lib/platform/projects/slug";
import { mirotechCreateHubProject } from "@/lib/platform/publishing/mirotech/hub-remote-write";
import type { ProjectWorkflowCreateInput } from "@/lib/platform/projects/types";

export type MirotechCaseStudyCreateResult = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  status: string;
  heroImage: string | null;
  thumbnailImage: string | null;
  sectionCount: number;
  challenge: string | null;
  outcome: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  publishMirotech: boolean;
};

export async function createMirotechCaseStudyDraft(
  input: ProjectWorkflowCreateInput,
  templateDefaults: Record<string, unknown> = {}
): Promise<MirotechCaseStudyCreateResult> {
  const title = input.title?.trim();
  if (!title) {
    throw new ProjectWorkflowValidationError("title is required.");
  }

  const conflictPolicy = input.slugConflictPolicy ?? "suffix";
  const { slug } = await resolveProjectSlug({
    title,
    slugInput: input.slug,
    conflictPolicy,
    isTaken: async (candidate) => {
      const existing = await defaultMirotechContentReadPort.getMirotechWorkBySlug(candidate);
      return Boolean(existing);
    },
  });

  const payload: Record<string, unknown> = {
    title,
    slug,
    summary:
      input.summary?.trim() ||
      (typeof templateDefaults.summary === "string" ? templateDefaults.summary : "") ||
      "",
    status: "DRAFT",
    publishMirotech: true,
    publishBrightline: false,
    ...templateDefaults,
  };

  delete payload.pillarSlug;
  delete payload.section;

  const project = (await mirotechCreateHubProject(payload)) as HubProject;

  return {
    id: project.id,
    slug: project.slug,
    title: project.title,
    summary: project.summary ?? "",
    status: project.status ?? "DRAFT",
    heroImage: project.heroImage ?? null,
    thumbnailImage: project.thumbnailImage ?? null,
    sectionCount: project.sections?.length ?? 0,
    challenge: project.challenge ?? null,
    outcome: project.outcome ?? null,
    seoTitle: project.seoTitle ?? null,
    seoDescription: project.seoDescription ?? null,
    publishMirotech: project.publishMirotech ?? true,
  };
}
