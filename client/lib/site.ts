export const SITE_NAME = "MVP 4.18 | The Recruiting Standard";
export const SITE_SHORT_NAME = "MVP 4.18";
export const SITE_TAGLINE = "Potential deserves a pathway.";

export const SITE_DESCRIPTION =
  "MVP 4.18 — The Recruiting Standard. A clearer path from athletic potential to the right school. Connect student-athletes and school programs with verified profiles and private recruiting records.";

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://therecruitingstandard.com"
).replace(/\/+$/, "");

export const SITE_IMAGE = "/high-school-boys-hero.png";

export const SITE_KEYWORDS = [
  "athletic recruiting",
  "student-athletes",
  "high school recruiting",
  "verified athlete profiles",
  "school recruiting platform",
  "college recruiting",
  "MVP 4.18",
  "The Recruiting Standard",
];

export function siteUrl(path = ""): string {
  const normalizedPath = path.replace(/^\/+/, "");
  return normalizedPath ? `${SITE_URL}/${normalizedPath}` : SITE_URL;
}
