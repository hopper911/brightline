import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/config/brand";

const baseUrl =
  typeof process.env.NEXT_PUBLIC_SITE_URL === "string"
    ? process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")
    : BRAND.url;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/client", "/api"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
