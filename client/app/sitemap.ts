import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const routes = [
    { path: "", changeFrequency: "weekly", priority: 1 },
    { path: "about", changeFrequency: "monthly", priority: 0.8 },
    { path: "features", changeFrequency: "monthly", priority: 0.9 },
    { path: "pricing", changeFrequency: "monthly", priority: 0.9 },
    { path: "school-registration", changeFrequency: "monthly", priority: 0.8 },
    { path: "contact", changeFrequency: "monthly", priority: 0.7 },
    { path: "privacy-policy", changeFrequency: "yearly", priority: 0.3 },
    { path: "terms", changeFrequency: "yearly", priority: 0.3 },
  ] as const;

  return routes.map((route) => ({
    url: siteUrl(route.path),
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
