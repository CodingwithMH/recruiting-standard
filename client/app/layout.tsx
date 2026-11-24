import type { Metadata } from "next";
import "./globals.css";
import { CONTACT_EMAIL } from "@/lib/contact";
import {
  SITE_DESCRIPTION,
  SITE_IMAGE,
  SITE_NAME,
  SITE_SHORT_NAME,
  SITE_URL,
} from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_SHORT_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "athletic recruiting",
    "student-athletes",
    "high school recruiting",
    "verified athlete profiles",
    "school recruiting platform",
    "MVP 4.18",
  ],
  authors: [{ name: SITE_SHORT_NAME }],
  creator: SITE_SHORT_NAME,
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: {
      default: SITE_NAME,
      template: `%s | ${SITE_SHORT_NAME}`,
    },
    description: SITE_DESCRIPTION,
    images: [
      {
        url: SITE_IMAGE,
        alt: "Student-athletes on the field with MVP 4.18",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [SITE_IMAGE],
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_SHORT_NAME,
      alternateName: "The Recruiting Standard",
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      email: CONTACT_EMAIL,
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      publisher: { "@id": `${SITE_URL}/#organization` },
      inLanguage: "en-US",
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        {children}
      </body>
    </html>
  );
}
