import type { MetadataRoute } from "next";
import { services } from "./services/data";
import { BRAND } from "@/lib/config/brand";
import { PILLAR_SLUGS, getPillarBySlug } from "@/lib/portfolioPillars";
import { CASE_STUDIES } from "@/lib/caseStudies";
import { getPublishedProjectsBySections } from "@/lib/queries/work";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || BRAND.url;
  const now = new Date();

  const coreRoutes = [
    { path: "", priority: 1.0 },
    { path: "/work", priority: 0.9 },
    { path: "/case-studies", priority: 0.85 },
    { path: "/services", priority: 0.9 },
    { path: "/process", priority: 0.8 },
    { path: "/contact", priority: 0.8 },
    { path: "/about", priority: 0.7 },
    { path: "/privacy", priority: 0.5 },
    { path: "/terms", priority: 0.5 },
  ];

  const routes = coreRoutes.map(({ path, priority }) => ({
    url: `${baseUrl}${path}`,
    lastModified: now,
    priority,
  }));

  const serviceRoutes = services.map((service) => ({
    url: `${baseUrl}/services/${service.slug}`,
    lastModified: now,
    priority: 0.8,
  }));

  const workPillarRoutes = PILLAR_SLUGS.map((slug) => ({
    url: `${baseUrl}/work/${slug}`,
    lastModified: now,
    priority: 0.8,
  }));

  const workProjectRoutes: MetadataRoute.Sitemap = [];
  for (const pillarSlug of PILLAR_SLUGS) {
    const pillar = getPillarBySlug(pillarSlug);
    if (!pillar || pillar.sections.length === 0) continue;
    try {
      const projects = await getPublishedProjectsBySections(pillar.sections);
      for (const p of projects) {
        workProjectRoutes.push({
          url: `${baseUrl}/work/${pillarSlug}/${p.slug}`,
          lastModified: now,
          priority: 0.7,
        });
      }
    } catch {
      // DB may not be available
    }
  }

  const caseStudyRoutes = CASE_STUDIES.map((c) => ({
    url: `${baseUrl}/case-studies/${c.slug}`,
    lastModified: now,
    priority: 0.75,
  }));

  return [
    ...routes,
    ...serviceRoutes,
    ...workPillarRoutes,
    ...workProjectRoutes,
    ...caseStudyRoutes,
  ];
}
