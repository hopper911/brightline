import type { MetadataRoute } from "next";
import { services } from "./services/data";
import { BRAND } from "@/lib/config/brand";
import { getProjects } from "@/lib/content";
import { getPublishedPortfolio } from "@/lib/portfolio";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = BRAND.url;
  const now = new Date();

  // Core pages (no /portfolio – everything under /work)
  const coreRoutes = [
    { path: "", priority: 1.0 },
    { path: "/services", priority: 0.9 },
    { path: "/work", priority: 0.9 },
    { path: "/contact", priority: 0.8 },
    { path: "/about", priority: 0.7 },
  ];

  const routes = coreRoutes.map(({ path, priority }) => ({
    url: `${baseUrl}${path}`,
    lastModified: now,
    priority,
  }));

  // Service pages
  const serviceRoutes = services.map((service) => ({
    url: `${baseUrl}/services/${service.slug}`,
    lastModified: now,
    priority: 0.8,
  }));

  // Work: content-based project pages
  const projects = getProjects();
  const workRoutes = projects.map((project) => ({
    url: `${baseUrl}/work/${project.slug}`,
    lastModified: now,
    priority: 0.7,
  }));

  // Work: portfolio (DB) project pages
  const portfolioItems = await getPublishedPortfolio({ includeDrafts: false });
  const portfolioWorkRoutes = portfolioItems.map((item) => ({
    url: `${baseUrl}/work/${item.categorySlug}/${item.slug}`,
    lastModified: now,
    priority: 0.7,
  }));

  return [
    ...routes,
    ...serviceRoutes,
    ...workRoutes,
    ...portfolioWorkRoutes,
  ];
}
