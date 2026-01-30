import type { MetadataRoute } from "next";
import { services } from "./services/data";
import { BRAND } from "@/lib/config/brand";
import { getProjects } from "@/lib/content";
import { workItems } from "@/app/lib/work";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = BRAND.url;
  const now = new Date();

  // Core pages
  const coreRoutes = [
    { path: "", priority: 1.0 },
    { path: "/services", priority: 0.9 },
    { path: "/portfolio", priority: 0.9 },
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

  // Work/project pages
  const projects = getProjects();
  const workRoutes = projects.map((project) => ({
    url: `${baseUrl}/work/${project.slug}`,
    lastModified: now,
    priority: 0.7,
  }));

  // Portfolio category pages
  const categories = Array.from(
    new Set(workItems.map((item) => item.categorySlug))
  );
  const categoryRoutes = categories.map((category) => ({
    url: `${baseUrl}/portfolio/${category}`,
    lastModified: now,
    priority: 0.8,
  }));

  // Portfolio case study pages
  const portfolioRoutes = workItems.map((item) => ({
    url: `${baseUrl}/portfolio/${item.categorySlug}/${item.slug}`,
    lastModified: now,
    priority: 0.7,
  }));

  return [
    ...routes,
    ...serviceRoutes,
    ...workRoutes,
    ...categoryRoutes,
    ...portfolioRoutes,
  ];
}
