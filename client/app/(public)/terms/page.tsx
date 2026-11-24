import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo";
import { termsOfUse } from "@/lib/legal-content";
import LegalPage from "@/components/shared/LegalPage";

export const metadata: Metadata = createPageMetadata({
  title: termsOfUse.eyebrow,
  description: termsOfUse.intro,
  path: "/terms",
});

export default function TermsPage() {
  return <LegalPage legalDocument={termsOfUse} />;
}
