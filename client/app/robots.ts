import type { MetadataRoute } from "next";
import { SITE_URL, siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/portal/",
          "/admin/",
          "/api/",
          "/document-preview",
          "/forgot-password",
          "/reset-password",
        ],
      },
    ],
    host: SITE_URL,
    sitemap: siteUrl("sitemap.xml"),
  };
}
