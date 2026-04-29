import type { MetadataRoute } from "next";
import { services } from "./services/data";
import { BRAND } from "@/lib/config/brand";
import { SEO_SERVICE_SLUGS } from "@/lib/seoServicePages";
import { CASE_STUDIES } from "@/lib/caseStudies";
import { getPublishedProjectsBySections } from "@/lib/queries/work";
import { getPublishedGalleryCards } from "@/lib/queries/public-galleries";
import { listPublishedStudioProjectSlugsForSitemap } from "@/lib/studio/studio-project-cms";
import { getVisibleWorkPillars } from "@/lib/work-pillar-settings";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || BRAND.url;
  const now = new Date();

  const coreRoutes = [
    { path: "", priority: 1.0 },
    { path: "/work", priority: 0.9 },
    { path: "/galleries", priority: 0.85 },
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

  let visiblePillars: Awaited<ReturnType<typeof getVisibleWorkPillars>> = [];
  try {
    visiblePillars = await getVisibleWorkPillars();
  } catch {
    visiblePillars = [];
  }

  const workPillarRoutes = visiblePillars.map((p) => ({
    url: `${baseUrl}/work/${p.slug}`,
    lastModified: now,
    priority: 0.8,
  }));

  const workProjectRoutes: MetadataRoute.Sitemap = [];
  for (const pillar of visiblePillars) {
    if (pillar.sections.length === 0) continue;
    try {
      const projects = await getPublishedProjectsBySections(pillar.sections);
      for (const proj of projects) {
        workProjectRoutes.push({
          url: `${baseUrl}/work/${pillar.slug}/${proj.slug}`,
          lastModified: now,
          priority: 0.7,
        });
      }
    } catch {
      // DB may not be available
    }
  }

  let studioProjectWorkRoutes: MetadataRoute.Sitemap = [];
  try {
    const studioRows = await listPublishedStudioProjectSlugsForSitemap();
    studioProjectWorkRoutes = studioRows.map((r) => ({
      url: `${baseUrl}/work/${encodeURIComponent(r.slug)}`,
      lastModified: r.updatedAt,
      priority: 0.72,
    }));
  } catch {
    // DB may not be available
  }

  const caseStudyRoutes = CASE_STUDIES.map((c) => ({
    url: `${baseUrl}/case-studies/${c.slug}`,
    lastModified: now,
    priority: 0.75,
  }));

  let galleryRoutes: MetadataRoute.Sitemap = [];
  try {
    const galleries = await getPublishedGalleryCards(100);
    galleryRoutes = galleries.map((gallery) => ({
      url: `${baseUrl}/galleries/${gallery.slug}`,
      lastModified: gallery.updatedAt,
      priority: 0.65,
    }));
  } catch {
    // DB may not be available
  }

  const seoServiceRoutes = SEO_SERVICE_SLUGS.map((slug) => ({
    url: `${baseUrl}/${slug}`,
    lastModified: now,
    priority: 0.85,
  }));

  return [
    ...routes,
    ...seoServiceRoutes,
    ...serviceRoutes,
    ...workPillarRoutes,
    ...workProjectRoutes,
    ...studioProjectWorkRoutes,
    ...galleryRoutes,
    ...caseStudyRoutes,
  ];
}
