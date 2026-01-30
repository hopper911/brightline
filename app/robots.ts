import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/config/brand";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/client", "/api"],
      },
    ],
    sitemap: `${BRAND.url}/sitemap.xml`,
  };
}
