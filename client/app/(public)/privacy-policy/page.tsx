import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo";
import { privacyPolicy } from "@/lib/legal-content";
import LegalPage from "@/components/shared/LegalPage";

export const metadata: Metadata = createPageMetadata({
  title: privacyPolicy.eyebrow,
  description: privacyPolicy.intro,
  path: "/privacy-policy",
});

export default function PrivacyPolicyPage() {
  return <LegalPage legalDocument={privacyPolicy} />;
}
