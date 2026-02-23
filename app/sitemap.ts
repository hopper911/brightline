import type { MetadataRoute } from "next";
import { services } from "./services/data";
import { BRAND } from "@/lib/config/brand";
import { SECTION_SLUGS } from "@/lib/config/sections";
import { getPublishedProjectsBySection } from "@/lib/queries/work";
import { slugToSection } from "@/lib/config/sections";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || BRAND.url;
  const now = new Date();

  const coreRoutes = [
    { path: "", priority: 1.0 },
    { path: "/work", priority: 0.9 },
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

  const workSectionRoutes = SECTION_SLUGS.map((slug) => ({
    url: `${baseUrl}/work/${slug}`,
    lastModified: now,
    priority: 0.8,
  }));

  const workProjectRoutes: MetadataRoute.Sitemap = [];
  for (const slug of SECTION_SLUGS) {
    try {
      const projects = await getPublishedProjectsBySection(slugToSection(slug));
      for (const p of projects) {
        workProjectRoutes.push({
          url: `${baseUrl}/work/${slug}/${p.slug}`,
          lastModified: now,
          priority: 0.7,
        });
      }
    } catch {
      // DB may not be available
    }
  }

  return [
    ...routes,
    ...serviceRoutes,
    ...workSectionRoutes,
    ...workProjectRoutes,
  ];
}
