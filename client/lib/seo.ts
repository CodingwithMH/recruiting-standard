import type { Metadata } from "next";
import { SITE_IMAGE, SITE_KEYWORDS, SITE_NAME, siteUrl } from "@/lib/site";

type PageSeoOptions = {
  title: string;
  description: string;
  path: string;
  image?: string;
  absoluteTitle?: boolean;
  index?: boolean;
};

export function createPageMetadata({
  title,
  description,
  path,
  image = SITE_IMAGE,
  absoluteTitle = false,
  index = true,
}: PageSeoOptions): Metadata {
  const canonical = siteUrl(path);
  const metadataTitle = absoluteTitle ? { absolute: title } : title;

  return {
    title: metadataTitle,
    description,
    keywords: SITE_KEYWORDS,
    alternates: { canonical },
    robots: index
      ? { index: true, follow: true }
      : { index: false, follow: true },
    openGraph: {
      type: "website",
      url: canonical,
      siteName: SITE_NAME,
      title,
      description,
      images: [
        {
          url: image,
          alt: "Student-athletes on the field with MVP 4.18",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}
