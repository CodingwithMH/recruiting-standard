import type { Metadata } from "next";
import { Building2, FileCheck, Shield, Clock, ArrowUpRight, ArrowLeft } from "lucide-react";
import SiteLink from "@/components/ui/SiteLink";
import InquiryForm from "@/components/shared/InquiryForm";

export const metadata: Metadata = {
  title: "Contact & Support",
  description:
    "Have questions about institutional school access, athlete document verification, or platform pricing? Reach out to The Recruiting Standard team.",
};

const departments = [
  {
    icon: Building2,
    badge: "INSTITUTIONAL ACCESS",
    title: "School & Coaching Inquiries",
    desc: "For Athletic Directors, Head Coaches, and department coordinators seeking school registration, manual billing, or permanent School ID assistance.",
    lead: "1–2 business day turnaround",
  },
  {
    icon: FileCheck,
    badge: "DOCUMENT VERIFICATION",
    title: "Athlete & Parent Support",
    desc: "Assistance with multi-sport profile creation, transcript uploads, verification queue status, and linked guardian workflows.",
    lead: "Dedicated review queue",
  },
  {
    icon: Shield,
    badge: "PLATFORM INTEGRITY",
    title: "Compliance & Security",
    desc: "Inquiries regarding student record privacy (FERPA), institutional data isolation, or platform administration.",
    lead: "Audited compliance team",
  },
];

export default function ContactPage() {
  return (
    <>
      {/* Page Hero + Form */}
      <section className="py-16 sm:py-20 px-[6%] bg-[#f4f7fc] border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-5">
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
              <span>LET&apos;S CONNECT</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-semibold text-[#102341] tracking-tight leading-tight mb-4">
              Good things start with a conversation.
            </h1>
            <p className="text-base text-[#65748a] leading-relaxed mb-6">
              Whether you are an Athletic Director preparing your program for the upcoming season or a
              student-athlete navigating profile verification, our team is here to assist.
            </p>
          </div>

          <div className="lg:col-span-7">
            <InquiryForm type="contact" />
          </div>
        </div>
      </section>

      {/* Department Inquiries Grid */}
      <section className="py-20 px-[6%] bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mb-12">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-[#102341] text-xs font-semibold uppercase tracking-wider mb-3">
              <span>Direct Routing</span>
            </div>
            <h2 className="text-3xl font-semibold text-[#102341] tracking-tight mb-2">
              How our team can assist your program.
            </h2>
            <p className="text-sm text-[#65748a]">
              Every inquiry is routed directly to specialized team members to ensure prompt, accurate guidance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {departments.map((dept) => {
              const IconComponent = dept.icon;
              return (
                <article
                  key={dept.title}
                  className="bg-[#f8fafc] rounded-2xl p-7 border border-slate-200/80 hover:border-blue-300 hover:bg-white hover:shadow-md transition-all duration-200 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-5">
                      <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-2xs">
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-mono font-bold text-[#65748a] uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded-md">
                        {dept.badge}
                      </span>
                    </div>

                    <h3 className="text-base font-semibold text-[#102341] mb-2">{dept.title}</h3>
                    <p className="text-xs sm:text-sm text-[#65748a] leading-relaxed mb-6">{dept.desc}</p>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-semibold text-[#102341] pt-4 border-t border-slate-200/60">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>{dept.lead}</span>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Response Commitment Section */}
      <section className="py-20 px-[6%] bg-[#f8fafc]/70 border-t border-slate-200/80">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="max-w-xl">
            <span className="text-[10px] font-bold tracking-widest text-[#65748a] uppercase block mb-2 font-mono">
              OUR COMMITMENT
            </span>
            <h2 className="text-3xl font-semibold text-[#102341] tracking-tight mb-3">
              We read every message. <br />
              <span className="text-[#65748a] font-normal">You&apos;ll hear from us promptly.</span>
            </h2>
            <p className="text-sm text-[#65748a] leading-relaxed">
              We aim to respond to all institutional and student inquiries within one to two business days.
              If your goal is immediate school onboarding, submitting the official School Registration form
              initiates administrative review faster than a general contact inquiry.
            </p>
          </div>
          <SiteLink
            href="/school-registration"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-[#102341] text-white font-bold text-xs sm:text-sm hover:bg-[#1d3d68] transition-colors shadow-sm shrink-0"
          >
            <span>Submit School Registration</span>
            <ArrowUpRight className="w-4 h-4 text-[#bed8ff]" />
          </SiteLink>
        </div>
      </section>
    </>
  );
}
