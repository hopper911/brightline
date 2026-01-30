import type { MetadataRoute } from "next";
import { services } from "./services/data";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://brightlinephotography.co";

  const coreRoutes = [
    "",
    "/services",
    "/portfolio",
    "/work",
    "/contact",
    "/about",
  ];

  const routes = coreRoutes.map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
  }));

  const serviceRoutes = services.map((service) => ({
    url: `${baseUrl}/services/${service.slug}`,
    lastModified: new Date(),
  }));

  return [...routes, ...serviceRoutes];
}
