import "server-only";

import type { ContentRef } from "@/lib/platform/content/types";
import { createPlatformContextForTenant } from "@/lib/platform/context/types";
import { isAsyncPublishAccepted } from "@/lib/platform/publishing/async-publish-types";
import { resolveStudioHubProjectPatch } from "@/lib/platform/publishing/integrations/studio-hub-publish";
import { publishApprovedProject } from "@/lib/platform/projects/project-publish-service";
import type { StudioProjectEditorSection } from "@/lib/studio/projects/validate-studio-project-section";
import { validateStudioProjectSectionSave } from "@/lib/studio/projects/validate-studio-project-section";
import { prisma } from "@/lib/prisma";
import {
  getPillarBySlug,
  getPrimaryWorkSection,
} from "@/lib/work-pillar-settings";

export async function saveStudioProjectSection(
  ref: ContentRef,
  section: StudioProjectEditorSection,
  rawData: Record<string, unknown>
): Promise<{ ok: true; jobId?: string } | { ok: false; error: string }> {
  const data = validateStudioProjectSectionSave(ref, section, rawData);

  if (section === "publishing") {
    const wantsPublish =
      ref.type === "work-project"
        ? Boolean((data as { published?: boolean }).published)
        : String((data as { status?: string }).status ?? "").toUpperCase() === "PUBLISHED";

    if (wantsPublish) {
      const context = createPlatformContextForTenant(ref.tenant);
      const outcome = await publishApprovedProject(context, { kind: "legacy_admin" }, ref);
      if (!outcome.ok) {
        return { ok: false, error: outcome.error ?? "Publish not allowed." };
      }
      if (outcome.async) {
        return { ok: true, jobId: outcome.jobId };
      }
      return { ok: true };
    }
  }

  if (ref.type === "work-project" && ref.tenant === "brightline") {
    const updateData: Record<string, unknown> = { ...data };
    if (typeof data.pillar === "string" && data.pillar.trim()) {
      const pillar = await getPillarBySlug(data.pillar.trim().toLowerCase());
      if (!pillar) {
        return { ok: false, error: "Unknown pillar slug." };
      }
      updateData.section = getPrimaryWorkSection(pillar);
      delete updateData.pillar;
    }

    await prisma.workProject.update({
      where: { id: ref.id },
      data: updateData,
    });
    return { ok: true };
  }

  if (ref.type === "mirotech-case-study" && ref.tenant === "mirotech") {
    const result = await resolveStudioHubProjectPatch(ref.id, data);
    if (isAsyncPublishAccepted(result)) {
      return { ok: true, jobId: result.jobId };
    }
    return { ok: true };
  }

  return { ok: false, error: "Unsupported project type." };
}
