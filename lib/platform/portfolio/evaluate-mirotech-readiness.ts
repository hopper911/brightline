/**
 * Mirotech portfolio launch readiness (Phase 26).
 */

import "server-only";

import { listHubProjects } from "@/lib/dual-brand/studio-hub";
import { validateMirotechProjectCompleteness } from "@/lib/platform/projects/completeness/mirotech-case-study";
import { buildSeoCompletenessChecks } from "@/lib/platform/projects/completeness/seo";
import { validateProjectPublishMedia } from "@/lib/platform/projects/validate-publish-media";
import { loadAllStoredProjectWorkflowStates } from "@/lib/platform/projects/workflow-state";
import { listPlatformPublishingJobs } from "@/lib/platform/jobs/publishing-jobs-query";
import type { PortfolioReadinessTenantConfig } from "@/lib/platform/portfolio/readiness-config";
import {
  buildTenantReadiness,
  type PortfolioReadinessCheck,
} from "@/lib/platform/portfolio/readiness-types";

export async function evaluateMirotechPortfolioReadiness(
  config: PortfolioReadinessTenantConfig
): Promise<ReturnType<typeof buildTenantReadiness>> {
  const checks: PortfolioReadinessCheck[] = [];
  const projects = await listHubProjects();
  const published = projects.filter((p) => String(p.status).toUpperCase() === "PUBLISHED");
  const publishMirotech = published.filter((p) => p.publishMirotech);
  const featured = publishMirotech.filter((p) => p.featuredMirotech);

  if (typeof config.minPublishedProjects === "number" && config.minPublishedProjects > 0) {
    const passed = publishMirotech.length >= config.minPublishedProjects;
    checks.push({
      id: "min-published",
      label: `Minimum published case studies (${config.minPublishedProjects})`,
      passed,
      severity: "blocker",
      detail: passed
        ? undefined
        : `${publishMirotech.length} published on Mirotech (need ${config.minPublishedProjects}).`,
    });
  }

  const requiredCategories = (config.requiredCategories ?? []).map((c) => c.trim()).filter(Boolean);
  if (requiredCategories.length > 0) {
    for (const category of requiredCategories) {
      const catLower = category.toLowerCase();
      const count = publishMirotech.filter((p) =>
        (p.categories ?? []).some((c) => c.trim().toLowerCase() === catLower)
      ).length;
      checks.push({
        id: `category-${catLower}`,
        label: `Category “${category}” has published case study`,
        passed: count > 0,
        severity: "blocker",
        detail: count === 0 ? `No published case study in category “${category}”.` : undefined,
      });
    }
  }

  const featuredMissingHero = featured.filter((p) => !p.heroImage?.trim() && !p.thumbnailImage?.trim());
  checks.push({
    id: "featured-hero",
    label: "Featured case studies have hero media",
    passed: featuredMissingHero.length === 0,
    severity: "blocker",
    detail:
      featuredMissingHero.length === 0
        ? undefined
        : `${featuredMissingHero.length} featured missing hero: ${featuredMissingHero
            .map((p) => p.title)
            .slice(0, 3)
            .join(", ")}`,
  });

  const invalidHomepageFeatured = projects.filter(
    (p) =>
      p.featuredMirotech &&
      (String(p.status).toUpperCase() !== "PUBLISHED" || !p.publishMirotech)
  );
  checks.push({
    id: "homepage-featured",
    label: "Homepage featured case studies are published on Mirotech",
    passed: invalidHomepageFeatured.length === 0,
    severity: "blocker",
    detail:
      invalidHomepageFeatured.length === 0
        ? undefined
        : `${invalidHomepageFeatured.length} featured case study(s) not published on Mirotech.`,
  });

  const missingOg = publishMirotech.filter((p) => {
    const seo = buildSeoCompletenessChecks({
      seoTitle: p.seoTitle,
      seoDescription: p.seoDescription,
      openGraphAssetKey: p.heroImage ?? p.thumbnailImage,
    });
    return seo.some((c) => c.key === "openGraphAsset" && !c.passed);
  });
  if (missingOg.length > 0) {
    checks.push({
      id: "og-media",
      label: "Published case studies have Open Graph media",
      passed: false,
      severity: "blocker",
      detail: `${missingOg.length} case study(s) missing OG media.`,
    });
  }

  const incompletePublished = publishMirotech.filter((p) => {
    const result = validateMirotechProjectCompleteness({
      title: p.title,
      slug: p.slug,
      summary: p.summary ?? "",
      status: p.status ?? "PUBLISHED",
      heroImage: p.heroImage ?? null,
      thumbnailImage: p.thumbnailImage ?? null,
      sectionCount: p.sections?.length ?? 0,
      challenge: p.challenge ?? null,
      outcome: p.outcome ?? null,
      seoTitle: p.seoTitle ?? null,
      seoDescription: p.seoDescription ?? null,
      publishMirotech: p.publishMirotech ?? true,
    });
    return !result.complete;
  });

  checks.push({
    id: "published-completeness",
    label: "Published case studies pass completeness + SEO",
    passed: incompletePublished.length === 0,
    severity: "blocker",
    detail:
      incompletePublished.length === 0
        ? undefined
        : `${incompletePublished.length} published case study(s) incomplete.`,
  });

  let brokenMedia = 0;
  for (const project of publishMirotech) {
    const mediaCheck = await validateProjectPublishMedia({
      tenant: "mirotech",
      type: "mirotech-case-study",
      id: project.id,
    });
    if (!mediaCheck.valid) brokenMedia += 1;
  }
  checks.push({
    id: "media-keys",
    label: "Published case study media keys present",
    passed: brokenMedia === 0,
    severity: "blocker",
    detail: brokenMedia === 0 ? undefined : `${brokenMedia} case study(s) missing media keys.`,
  });

  const brokenSlugs = publishMirotech.filter((p) => !p.slug?.trim());
  checks.push({
    id: "public-slugs",
    label: "Published case studies have public slugs",
    passed: brokenSlugs.length === 0,
    severity: "blocker",
    detail: brokenSlugs.length > 0 ? `${brokenSlugs.length} missing slug.` : undefined,
  });

  const jobList = await listPlatformPublishingJobs({ tenantSlugs: ["mirotech"], limit: 50 });
  const failedJobs = jobList.counts.failed;
  checks.push({
    id: "publishing-jobs",
    label: "No failed publishing jobs",
    passed: failedJobs === 0,
    severity: "blocker",
    detail: failedJobs > 0 ? `${failedJobs} failed publishing job(s) in queue.` : undefined,
  });

  const workflowStates = await loadAllStoredProjectWorkflowStates();
  let publishFailedCount = 0;
  for (const project of projects) {
    const key = `mirotech:mirotech-case-study:${project.id}`;
    const state = workflowStates.get(key);
    if (state?.publishFailedAt) publishFailedCount += 1;
  }
  checks.push({
    id: "workflow-publish-failed",
    label: "No projects with workflow publish failure",
    passed: publishFailedCount === 0,
    severity: "blocker",
    detail:
      publishFailedCount > 0
        ? `${publishFailedCount} project(s) have publishFailedAt on workflow state.`
        : undefined,
  });

  const awaitingApproval = projects.filter((p) => {
    const key = `mirotech:mirotech-case-study:${p.id}`;
    const state = workflowStates.get(key);
    return state?.lifecycle === "IN_REVIEW" || state?.lifecycle === "APPROVED";
  });
  if (awaitingApproval.length > 0) {
    checks.push({
      id: "pipeline-review",
      label: "Case studies awaiting review or publish",
      passed: false,
      severity: "warning",
      detail: `${awaitingApproval.length} in review or approved (not a launch blocker).`,
    });
  }

  const legacyFallback = publishMirotech.filter(
    (p) => Boolean(p.heroImage?.trim()) && !p.thumbnailImage?.trim()
  );
  if (legacyFallback.length > 0) {
    checks.push({
      id: "legacy-thumbnail",
      label: "Projects using hero-only thumbnail fallback",
      passed: false,
      severity: "warning",
      detail: `${legacyFallback.length} case study(s) have hero but no dedicated thumbnail.`,
    });
  }

  return buildTenantReadiness("mirotech", "MiroTech Portfolio Readiness", checks);
}
