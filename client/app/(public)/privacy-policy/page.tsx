import type { Metadata } from "next";
import { AlertCircle, ArrowLeft } from "lucide-react";
import SiteLink from "@/components/ui/SiteLink";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How The Recruiting Standard handles your information.",
};

const sections = [
  {
    title: "Information you provide",
    body: "When the service launches, we may collect information you submit, such as your name, school, professional email, profile details, and messages. Preview forms currently do not transmit or save submissions.",
  },
  {
    title: "How information is used",
    body: "Information will be used to provide account access, support recruiting connections, respond to inquiries, and maintain the service. Details will be updated to reflect the actual services in use.",
  },
  {
    title: "Sharing and visibility",
    body: "Profile visibility and any sharing with other users or service providers will be explained before live accounts become available. Do not submit sensitive athlete information through this preview.",
  },
  {
    title: "Retention and your choices",
    body: "The final policy will describe retention periods and how to request access, correction, or deletion of account information.",
  },
  {
    title: "Cookies and contact",
    body: "This preview does not include advertising analytics. Contact channels and details about any production cookies will be added before launch.",
  },
];

export default function PrivacyPolicyPage() {
  return (
    <>
      <section className="py-16 sm:py-20 px-[6%] bg-[#f4f7fc] border-b border-slate-200/80">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <SiteLink
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-[#102341] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to home</span>
            </SiteLink>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200 text-[#102341] text-xs font-semibold uppercase tracking-wider mb-4">
            <span>PRIVACY POLICY</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-semibold text-[#102341] tracking-tight leading-tight mb-3">
            Your information matters.
          </h1>
          <p className="text-xs text-slate-500 font-mono">
            Draft policy · Last updated October 27, 2026
          </p>
        </div>
      </section>

      <section className="py-16 px-[6%] bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="p-5 rounded-2xl bg-blue-50/70 border border-blue-200/80 flex items-start gap-3 mb-12">
            <AlertCircle className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm text-blue-900 leading-relaxed">
              <strong>DRAFT — awaiting client-approved content.</strong> This is placeholder copy for
              the preview. Operating entity, contact details, service providers, and jurisdiction
              will be confirmed prior to production launch.
            </div>
          </div>

          <div className="space-y-10">
            {sections.map(({ title, body }) => (
              <article key={title} className="pb-8 border-b border-slate-100 last:border-b-0">
                <h2 className="text-xl font-bold text-[#102341] mb-3">{title}</h2>
                <p className="text-sm text-[#65748a] leading-relaxed m-0">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
