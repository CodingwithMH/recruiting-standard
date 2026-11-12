import type { Metadata } from "next";
import {
  Building2,
  CreditCard,
  Shield,
  Clock,
  ArrowUpRight,
  ArrowLeft,
  Mail,
} from "lucide-react";
import SiteLink from "@/components/ui/SiteLink";
import InquiryForm from "@/components/shared/InquiryForm";
import {
  CONTACT_EMAIL,
  CONTACT_EMAIL_HREF,
  CONTACT_RESPONSE_TIME,
} from "@/lib/contact";

export const metadata: Metadata = {
  title: "Contact MVP 4.18",
  description:
    "Contact MVP 4.18 about school registration, pricing, or a demo. Athletic directors can also email the team directly for a backup contact option.",
};

const helpTopics = [
  {
    icon: Building2,
    badge: "SCHOOL REGISTRATION",
    title: "Registration & onboarding",
    desc: "Questions about registering your school, obtaining a permanent School ID, onboarding staff, or setting up your program.",
  },
  {
    icon: CreditCard,
    badge: "PRICING & DEMOS",
    title: "Pricing and product demos",
    desc: "Ask about annual or monthly plans, manual invoicing, or schedule a walkthrough for your athletic department.",
  },
  {
    icon: Shield,
    badge: "SUPPORT & PRIVACY",
    title: "Athlete support and privacy",
    desc: "Help with athlete or parent accounts, verification status, FERPA questions, or institutional data isolation.",
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
              Contact MVP 4.18
            </h1>
            <p className="text-base text-[#65748a] leading-relaxed mb-6">
              Athletic directors: ask us about school registration, pricing, or a
              demo. We will help you understand what your program needs before you
              commit.
            </p>

            <div className="rounded-xl border border-slate-200 bg-white p-4 flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#f4f7fc] border border-slate-200 flex items-center justify-center text-[#102341] shrink-0">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-bold tracking-wider text-[#65748a] uppercase font-mono mb-1">
                  Backup contact
                </p>
                <a
                  href={CONTACT_EMAIL_HREF}
                  className="text-sm font-semibold text-[#102341] underline break-all"
                >
                  {CONTACT_EMAIL}
                </a>
                <p className="text-[11px] text-[#65748a] leading-relaxed mt-1">
                  {CONTACT_RESPONSE_TIME}
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            <InquiryForm type="contact" />
          </div>
        </div>
      </section>

      {/* Help Topics Grid */}
      <section className="py-20 px-[6%] bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mb-12">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-[#102341] text-xs font-semibold uppercase tracking-wider mb-3">
              <span>How We Can Help</span>
            </div>
            <h2 className="text-3xl font-semibold text-[#102341] tracking-tight mb-2">
              One inbox, clear answers.
            </h2>
            <p className="text-sm text-[#65748a] leading-relaxed">
              Messages submitted here go directly to the MVP 4.18 team. We aim to
              respond within 1–2 business days.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {helpTopics.map((topic) => {
              const IconComponent = topic.icon;
              return (
                <article
                  key={topic.title}
                  className="bg-[#f8fafc] rounded-2xl p-7 border border-slate-200/80 hover:border-blue-300 hover:bg-white hover:shadow-md transition-all duration-200 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-5">
                      <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-2xs">
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-mono font-bold text-[#65748a] uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded-md">
                        {topic.badge}
                      </span>
                    </div>

                    <h3 className="text-base font-semibold text-[#102341] mb-2">
                      {topic.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-[#65748a] leading-relaxed mb-6">
                      {topic.desc}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-semibold text-[#102341] pt-4 border-t border-slate-200/60">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>1–2 business day response target</span>
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
              <span className="text-[#65748a] font-normal">
                You&apos;ll hear from us within 1–2 business days.
              </span>
            </h2>
            <p className="text-sm text-[#65748a] leading-relaxed">
              If your goal is immediate school onboarding, submitting the official
              School Registration form initiates administrative review faster than a
              general contact inquiry. Transcripts and other student records should
              only be uploaded through the secure portal, never emailed through this
              form.
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
