import "server-only";

import type { ContentRef } from "@/lib/platform/content/types";
import { getHubProject } from "@/lib/dual-brand/studio-hub";
import { brightlineWorkProjectPublicPath } from "@/lib/platform/content/integrations/map-brightline-content";
import { mirotechCaseStudyPublicPath } from "@/lib/platform/content/integrations/map-mirotech-content";
import { defaultProjectWorkflowService } from "@/lib/platform/projects/server";
import { getStoredProjectPublishedSnapshot } from "@/lib/platform/projects/published-snapshot";
import {
  getStoredProjectWorkflowState,
  setStoredProjectWorkflowState,
} from "@/lib/platform/projects/workflow-state";
import { validateProjectPublishMedia } from "@/lib/platform/projects/validate-publish-media";
import { evaluatePublishedProjectVerification } from "@/lib/platform/projects/verification/evaluate-verification";
import { headPublicUrl } from "@/lib/platform/projects/verification/network-check";
import type { PublishedProjectVerificationResult } from "@/lib/platform/projects/verification/types";
import { getProjectByPillarAndSlug } from "@/lib/queries/work";
import { getPublicR2Url } from "@/lib/r2";
import { getSectionToPillarSlugMap } from "@/lib/work-pillar-settings";
import { prisma } from "@/lib/prisma";
import type { WorkSection } from "@prisma/client";

const TENANT_HOST_SUFFIXES: Record<"brightline" | "mirotech", readonly string[]> = {
  brightline: ["brightlinephotography.com"],
  mirotech: ["mirotech.solutions"],
};

export async function verifyPublishedProject(ref: ContentRef): Promise<PublishedProjectVerificationResult> {
  if (ref.type === "work-project" && ref.tenant === "brightline") {
    return verifyBrightlineWorkProject(ref);
  }
  if (ref.type === "mirotech-case-study" && ref.tenant === "mirotech") {
    return verifyMirotechCaseStudy(ref);
  }
  throw new Error("Unsupported project type for verification.");
}

export async function applyPublishedProjectVerification(
  ref: ContentRef,
  result: PublishedProjectVerificationResult
): Promise<void> {
  const stored = await getStoredProjectWorkflowState(ref);
  await setStoredProjectWorkflowState(ref, {
    lifecycle: stored?.lifecycle ?? "PUBLISHED",
    reviewNotes: stored?.reviewNotes ?? null,
    updatedAt: new Date().toISOString(),
    templateId: stored?.templateId ?? null,
    priority: stored?.priority ?? "NORMAL",
    publishFailedAt: stored?.publishFailedAt ?? null,
    publishFailedReason: stored?.publishFailedReason ?? null,
    verificationHealthy: result.verificationHealthy,
    verificationWarning: result.verificationWarning,
    verificationFailed: result.verificationFailed,
    verificationCheckedAt: result.checkedAt,
    verificationReason: result.reason,
    verificationDetails: result.details,
  });
}

export async function verifyAndStorePublishedProject(
  ref: ContentRef
): Promise<PublishedProjectVerificationResult> {
  const result = await verifyPublishedProject(ref);
  await applyPublishedProjectVerification(ref, result);
  return result;
}

async function verifyBrightlineWorkProject(
  ref: ContentRef
): Promise<PublishedProjectVerificationResult> {
  const project = await prisma.workProject.findUnique({
    where: { id: ref.id },
    include: {
      heroMedia: true,
      _count: { select: { media: true } },
    },
  });

  if (!project) {
    return evaluatePublishedProjectVerification({
      tenant: "brightline",
      published: false,
      publishTargetOk: false,
      title: "",
      slug: "",
      publicPath: null,
      routeResolvable: false,
      mediaValidation: { valid: false, missing: ["project not found"] },
      completeness: { complete: false, score: 0, missing: ["project"], warnings: [] },
    });
  }

  const sectionToPillar = await getSectionToPillarSlugMap();
  const pillarSlug = sectionToPillar[project.section as WorkSection] ?? null;
  const publicPath = pillarSlug
    ? brightlineWorkProjectPublicPath(pillarSlug, project.slug)
    : null;

  const routeProject =
    pillarSlug ? await getProjectByPillarAndSlug(pillarSlug, project.slug) : null;
  const routeResolvable = Boolean(routeProject);

  const snapshot = {
    title: project.title,
    slug: project.slug,
    section: project.section,
    summary: project.summary,
    description: project.description,
    heroMediaId: project.heroMediaId,
    mediaCount: project._count.media,
    seoTitle: project.seoTitle,
    metaDescription: project.metaDescription,
    heroKeyFull: project.heroMedia?.keyFull ?? project.heroMedia?.keyThumb ?? null,
    published: project.published,
  };

  const completeness = defaultProjectWorkflowService.evaluateCompleteness({
    tenant: "brightline",
    kind: "work-project",
    snapshot,
  });

  const mediaValidation = await validateProjectPublishMedia(ref);
  const publishedSnapshot = await getStoredProjectPublishedSnapshot(ref);

  let publicPageHead: Awaited<ReturnType<typeof headPublicUrl>> | null = null;
  if (project.published && publicPath) {
    publicPageHead = await headPublicUrl(publicPath, {
      allowedHostSuffixes: TENANT_HOST_SUFFIXES.brightline,
    });
  }

  let heroMediaHead: Awaited<ReturnType<typeof headPublicUrl>> | null = null;
  const heroKey =
    project.heroMedia?.keyFull ??
    project.heroMedia?.keyThumb ??
    project.heroMedia?.posterKey ??
    null;
  if (project.published && heroKey?.trim()) {
    heroMediaHead = await headPublicUrl(getPublicR2Url(heroKey), {
      allowedHostSuffixes: TENANT_HOST_SUFFIXES.brightline,
    });
  }

  return evaluatePublishedProjectVerification({
    tenant: "brightline",
    published: project.published,
    publishTargetOk: project.published,
    title: project.title,
    slug: project.slug,
    publicPath,
    routeResolvable,
    mediaValidation,
    completeness,
    publishedSnapshot,
    publicPageHead,
    heroMediaHead,
  });
}

async function verifyMirotechCaseStudy(ref: ContentRef): Promise<PublishedProjectVerificationResult> {
  const project = await getHubProject(ref.id);
  if (!project) {
    return evaluatePublishedProjectVerification({
      tenant: "mirotech",
      published: false,
      publishTargetOk: false,
      title: "",
      slug: "",
      publicPath: null,
      routeResolvable: false,
      mediaValidation: { valid: false, missing: ["project not found"] },
      completeness: { complete: false, score: 0, missing: ["project"], warnings: [] },
    });
  }

  const published = String(project.status).toUpperCase() === "PUBLISHED";
  const publishTargetOk = Boolean(project.publishMirotech);
  const publicPath = project.slug?.trim() ? mirotechCaseStudyPublicPath(project.slug) : null;
  const routeResolvable =
    published && publishTargetOk && Boolean(project.slug?.trim()) && Boolean(project.title?.trim());

  const snapshot = {
    title: project.title,
    slug: project.slug,
    summary: project.summary ?? "",
    status: project.status ?? "DRAFT",
    heroImage: project.heroImage ?? null,
    thumbnailImage: project.thumbnailImage ?? null,
    sectionCount: project.sections?.length ?? 0,
    challenge: project.challenge ?? null,
    outcome: project.outcome ?? null,
    seoTitle: project.seoTitle ?? null,
    seoDescription: project.seoDescription ?? null,
    publishMirotech: project.publishMirotech ?? false,
  };

  const completeness = defaultProjectWorkflowService.evaluateCompleteness({
    tenant: "mirotech",
    kind: "mirotech-case-study",
    snapshot,
  });

  const mediaValidation = await validateProjectPublishMedia(ref);
  const publishedSnapshot = await getStoredProjectPublishedSnapshot(ref);

  let publicPageHead: Awaited<ReturnType<typeof headPublicUrl>> | null = null;
  if (published && publishTargetOk && publicPath) {
    publicPageHead = await headPublicUrl(publicPath, {
      allowedHostSuffixes: TENANT_HOST_SUFFIXES.mirotech,
    });
  }

  let heroMediaHead: Awaited<ReturnType<typeof headPublicUrl>> | null = null;
  const heroKey = project.heroImage?.trim() || project.thumbnailImage?.trim() || null;
  if (published && heroKey) {
    const heroUrl = heroKey.startsWith("http") ? heroKey : getPublicR2Url(heroKey);
    heroMediaHead = await headPublicUrl(heroUrl, {
      allowedHostSuffixes: TENANT_HOST_SUFFIXES.mirotech,
    });
  }

  return evaluatePublishedProjectVerification({
    tenant: "mirotech",
    published,
    publishTargetOk,
    title: project.title,
    slug: project.slug,
    publicPath,
    routeResolvable,
    mediaValidation,
    completeness,
    publishedSnapshot,
    publicPageHead,
    heroMediaHead,
  });
}
