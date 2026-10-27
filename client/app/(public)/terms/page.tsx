import type { Metadata } from "next";
import { AlertCircle, ArrowLeft } from "lucide-react";
import SiteLink from "@/components/ui/SiteLink";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "MVP 4.18 terms of use.",
};

const sections = [
  {
    title: "Using the platform",
    body: "MVP 4.18 is intended to help schools and student-athletes discover and communicate with each other. This preview is for demonstration and does not provide live accounts.",
  },
  {
    title: "Account responsibilities",
    body: "When registration becomes available, users must provide accurate information, protect account credentials, and have authority to represent their institution.",
  },
  {
    title: "Respectful participation",
    body: "Users must not impersonate others, misuse personal information, upload material without permission, harass other users, or use the platform unlawfully.",
  },
  {
    title: "Recruiting and admissions",
    body: "Connections do not guarantee recruitment, admission, scholarships, eligibility, or athletic placement. Each institution makes its own decisions and is responsible for applicable requirements.",
  },
  {
    title: "Plans and payments",
    body: "Displayed prices are the actual launch plans. Payments are collected manually by our team. Final cancellation terms and payment conditions will be provided before any purchase.",
  },
  {
    title: "Changes and contact",
    body: "The final terms will identify the operating entity, governing law, dispute process, and support contact before the service launches.",
  },
];

export default function TermsPage() {
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
            <span>TERMS OF USE</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-semibold text-[#102341] tracking-tight leading-tight mb-3">
            A clear foundation.
          </h1>
          <p className="text-xs text-slate-500 font-mono">
            Draft terms · Last updated October 27, 2026
          </p>
        </div>
      </section>

      <section className="py-16 px-[6%] bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="p-5 rounded-2xl bg-blue-50/70 border border-blue-200/80 flex items-start gap-3 mb-12">
            <AlertCircle className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm text-blue-900 leading-relaxed">
              <strong>DRAFT — awaiting client-approved content.</strong> This is placeholder copy for
              the preview. Operating entity, contact details, governing law, and dispute process will
              be confirmed prior to production launch.
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
