import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo";
import { SITE_NAME } from "@/lib/site";
import Hero from "@/components/home/Hero";
import SportStrip from "@/components/home/SportStrip";
import Intro from "@/components/home/Intro";
import VerifiedProfiles from "@/components/home/VerifiedProfiles";
import FeatureGrid from "@/components/home/FeatureGrid";
import RoleEcosystem from "@/components/home/RoleEcosystem";
import Pathway from "@/components/home/Pathway";
import RecruitingWorkflow from "@/components/home/RecruitingWorkflow";
import SecuritySection from "@/components/home/SecuritySection";
import Mission from "@/components/home/Mission";
import Faq from "@/components/home/Faq";
import Cta from "@/components/home/Cta";

export const metadata: Metadata = createPageMetadata({
  title: SITE_NAME,
  description:
    "MVP 4.18 — The Recruiting Standard. A clearer path from athletic potential to the right school. Connect student-athletes and school programs with verified profiles and isolated records.",
  path: "/",
  absoluteTitle: true,
});

export default function Home() {
  return (
    <>
      <Hero />
      <SportStrip />
      <Intro />
      <VerifiedProfiles />
      <FeatureGrid />
      <RoleEcosystem />
      <Pathway />
      <RecruitingWorkflow />
      <SecuritySection />
      <Mission />
      <Faq />
      <Cta />
    </>
  );
}

