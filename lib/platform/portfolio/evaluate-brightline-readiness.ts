/**
 * Brightline portfolio launch readiness (Phase 26).
 */

import "server-only";

import type { WorkSection } from "@prisma/client";
import { validateBrightlineProjectCompleteness } from "@/lib/platform/projects/completeness/brightline-work-project";
import { buildSeoCompletenessChecks } from "@/lib/platform/projects/completeness/seo";
import { validateProjectPublishMedia } from "@/lib/platform/projects/validate-publish-media";
import type { PortfolioReadinessTenantConfig } from "@/lib/platform/portfolio/readiness-config";
import {
  buildTenantReadiness,
  type PortfolioReadinessCheck,
} from "@/lib/platform/portfolio/readiness-types";
import { getVisibleWorkPillars, getSectionToPillarSlugMap } from "@/lib/work-pillar-settings";
import { prisma } from "@/lib/prisma";
import { existsSync } from "node:fs";
import { join } from "node:path";

export async function evaluateBrightlinePortfolioReadiness(
  config: PortfolioReadinessTenantConfig
): Promise<ReturnType<typeof buildTenantReadiness>> {
  const checks: PortfolioReadinessCheck[] = [];

  const published = await prisma.workProject.findMany({
    where: { published: true },
    include: {
      heroMedia: true,
      media: { include: { media: true } },
      _count: { select: { media: true } },
    },
  });

  const featured = published.filter((p) => p.isFeatured);

  if (typeof config.minPublishedProjects === "number" && config.minPublishedProjects > 0) {
    const passed = published.length >= config.minPublishedProjects;
    checks.push({
      id: "min-published",
      label: `Minimum published projects (${config.minPublishedProjects})`,
      passed,
      severity: "blocker",
      detail: passed ? undefined : `${published.length} published (need ${config.minPublishedProjects}).`,
    });
  }

  if (typeof config.minPublishedPerPillar === "number" && config.minPublishedPerPillar > 0) {
    const pillars = await getVisibleWorkPillars();
    const photographyPillars = pillars.filter((p) => p.hub !== "dual-brand");
    for (const pillar of photographyPillars) {
      const sections = pillar.sections;
      const count = published.filter((p) => sections.includes(p.section)).length;
      const passed = count >= config.minPublishedPerPillar;
      checks.push({
        id: `pillar-${pillar.slug}`,
        label: `Pillar “${pillar.label}” has published work`,
        passed,
        severity: "warning",
        detail: passed
          ? undefined
          : `${count} published (configured minimum ${config.minPublishedPerPillar}).`,
      });
    }
  }

  const featuredMissingHero = featured.filter(
    (p) =>
      !p.heroMediaId ||
      (!p.heroMedia?.keyFull?.trim() && !p.heroMedia?.keyThumb?.trim())
  );
  checks.push({
    id: "featured-hero",
    label: "Featured projects have hero media",
    passed: featuredMissingHero.length === 0,
    severity: "blocker",
    detail:
      featuredMissingHero.length === 0
        ? undefined
        : `${featuredMissingHero.length} featured project(s) missing hero: ${featuredMissingHero
            .map((p) => p.title)
            .slice(0, 3)
            .join(", ")}${featuredMissingHero.length > 3 ? "…" : ""}`,
  });

  const incompletePublished = published.filter((p) => {
    const result = validateBrightlineProjectCompleteness({
      title: p.title,
      slug: p.slug,
      section: p.section,
      summary: p.summary,
      description: p.description,
      heroMediaId: p.heroMediaId,
      mediaCount: p._count.media,
      seoTitle: p.seoTitle,
      metaDescription: p.metaDescription,
      heroKeyFull: p.heroMedia?.keyFull ?? null,
    });
    return !result.complete;
  });

  checks.push({
    id: "published-completeness",
    label: "Published projects pass completeness + SEO",
    passed: incompletePublished.length === 0,
    severity: "blocker",
    detail:
      incompletePublished.length === 0
        ? undefined
        : `${incompletePublished.length} published project(s) incomplete.`,
  });

  const missingOg = published.filter((p) => {
    const ogKey = p.heroMedia?.keyFull ?? p.heroMedia?.keyThumb ?? null;
    const seo = buildSeoCompletenessChecks({
      seoTitle: p.seoTitle,
      seoDescription: p.metaDescription,
      openGraphAssetKey: ogKey,
    });
    return seo.some((c) => c.key === "openGraphAsset" && !c.passed);
  });
  if (missingOg.length > 0) {
    checks.push({
      id: "og-media",
      label: "Published projects have Open Graph media",
      passed: false,
      severity: "blocker",
      detail: `${missingOg.length} project(s) missing OG media.`,
    });
  }

  const galleryIssues = published.filter((p) => p._count.media > 0 && !p.heroMediaId);
  checks.push({
    id: "gallery-hero",
    label: "Projects with galleries have hero images",
    passed: galleryIssues.length === 0,
    severity: "warning",
    detail:
      galleryIssues.length === 0
        ? undefined
        : `${galleryIssues.length} published with gallery but no hero.`,
  });

  let brokenMedia = 0;
  for (const project of published) {
    const mediaCheck = await validateProjectPublishMedia({
      tenant: "brightline",
      type: "work-project",
      id: project.id,
    });
    if (!mediaCheck.valid) brokenMedia += 1;
  }
  checks.push({
    id: "media-keys",
    label: "Published project media keys resolve",
    passed: brokenMedia === 0,
    severity: "blocker",
    detail: brokenMedia === 0 ? undefined : `${brokenMedia} project(s) have missing media keys.`,
  });

  const sectionToPillar = await getSectionToPillarSlugMap();
  const brokenRoutes = published.filter((p) => {
    const pillarSlug = sectionToPillar[p.section as WorkSection];
    return !pillarSlug || !p.slug?.trim();
  });
  checks.push({
    id: "public-routes",
    label: "Published projects resolve to public work URLs",
    passed: brokenRoutes.length === 0,
    severity: "blocker",
    detail:
      brokenRoutes.length === 0
        ? undefined
        : `${brokenRoutes.length} published project(s) missing pillar route mapping.`,
  });

  const appRoot = process.cwd();
  for (const segment of ["contact", "galleries", "services", "about"]) {
    const pagePath = join(appRoot, "app", segment, "page.tsx");
    const passed = existsSync(pagePath);
    checks.push({
      id: `route-${segment}`,
      label: `Public page /${segment}`,
      passed,
      severity: "blocker",
      detail: passed ? undefined : `Missing app route file for /${segment}.`,
    });
  }

  const clientProjects = await prisma.project.count({ where: { published: true } });
  const clientRouteExists = existsSync(join(appRoot, "app", "client", "page.tsx"));
  checks.push({
    id: "client-portal",
    label: "Client delivery portal (separate from marketing work)",
    passed: clientRouteExists,
    severity: "warning",
    detail: clientRouteExists
      ? `${clientProjects} published client portal project(s) — marketing readiness is independent.`
      : "Client portal route missing; client workflow not verified.",
  });

  return buildTenantReadiness("brightline", "Brightline Portfolio Readiness", checks);
}
