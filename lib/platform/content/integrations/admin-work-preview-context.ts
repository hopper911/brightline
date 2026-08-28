import "server-only";

import { createPlatformContextForTenant } from "@/lib/platform/context/types";
import type { DefaultContentService } from "@/lib/platform/content/default-content-service";
import { defaultContentService } from "@/lib/platform/content/default-content-service";
import { fetchBrightlineWorkProjectById } from "@/lib/platform/content/integrations/default-brightline-content-read";
import { isPlatformFeatureEnabled } from "@/lib/platform/features";
import { getPillarBySlug, sectionToPillarSlug } from "@/lib/work-pillar-settings";

/** External contract for admin Work preview chrome (banner + live link). */
export type AdminWorkPreviewContext = {
  title: string;
  published: boolean;
  pillarSlug: string;
  pillarLabel: string;
  liveHref: string | null;
};

async function resolvePillarPresentation(
  pillarSlug: string
): Promise<{ pillarSlug: string; pillarLabel: string }> {
  const pillar = await getPillarBySlug(pillarSlug);
  return {
    pillarSlug,
    pillarLabel: pillar?.label ?? pillarSlug,
  };
}

/** Legacy path — direct Prisma read + pillar settings (pre-ContentService). */
export async function legacyResolveAdminWorkPreviewContext(
  projectId: string
): Promise<AdminWorkPreviewContext | null> {
  const row = await fetchBrightlineWorkProjectById(projectId);
  if (!row) return null;

  let pillarSlug = row.pillarSlug;
  let pillarLabel = pillarSlug;
  try {
    pillarSlug = await sectionToPillarSlug(row.section);
    const presentation = await resolvePillarPresentation(pillarSlug);
    pillarSlug = presentation.pillarSlug;
    pillarLabel = presentation.pillarLabel;
  } catch {
    pillarLabel = "Work";
    pillarSlug = "work";
  }

  return {
    title: row.title,
    published: row.published,
    pillarSlug,
    pillarLabel,
    liveHref: row.published ? `/work/${pillarSlug}/${row.slug}` : null,
  };
}

/** Platform path — ContentService → Brightline adapter. */
export async function platformResolveAdminWorkPreviewContext(
  projectId: string,
  contentService: DefaultContentService = defaultContentService
): Promise<AdminWorkPreviewContext | null> {
  const context = createPlatformContextForTenant("brightline");
  const ref = {
    tenant: "brightline" as const,
    type: "work-project" as const,
    id: projectId,
  };
  const summary = await contentService.resolveReference(context, ref);
  if (!summary) return null;

  const pillarSlug = summary.operational?.pillarSlug ?? "work";
  const presentation = await resolvePillarPresentation(pillarSlug);

  return {
    title: summary.title,
    published: summary.lifecycle === "published",
    pillarSlug: presentation.pillarSlug,
    pillarLabel: presentation.pillarLabel,
    liveHref:
      summary.lifecycle === "published" && summary.slug
        ? `/work/${presentation.pillarSlug}/${summary.slug}`
        : null,
  };
}

/**
 * Admin Work preview header context (Phase 5D consumer).
 * Flag off → legacy Prisma read. Flag on → ContentService + Brightline adapter.
 */
export async function resolveAdminWorkPreviewContext(
  projectId: string,
  options?: { contentService?: DefaultContentService }
): Promise<AdminWorkPreviewContext | null> {
  if (!isPlatformFeatureEnabled("content")) {
    return legacyResolveAdminWorkPreviewContext(projectId);
  }
  return platformResolveAdminWorkPreviewContext(projectId, options?.contentService);
}
