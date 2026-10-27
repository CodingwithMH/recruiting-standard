import type { Metadata } from "next";
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

// Root page — title uses the default from root layout metadata.
export const metadata: Metadata = {
  title: "The Recruiting Standard | Build your next chapter",
  description:
    "A clearer path from athletic potential to the right school. Connect student-athletes and school programs with verified profiles and isolated records.",
};

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

