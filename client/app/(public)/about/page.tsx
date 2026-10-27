import type { Metadata } from "next";
import { AlertCircle, CheckCircle2, Shield, Lock, FileText, ArrowRight, ArrowLeft } from "lucide-react";
import SiteLink from "@/components/ui/SiteLink";
import AboutStory from "@/components/about/AboutStory";
import AboutValues from "@/components/about/AboutValues";

export const metadata: Metadata = {
  title: "About Our Platform",
  description:
    "Learn about The Recruiting Standard's mission, verification standards, and institutional commitment.",
};

const governanceCards = [
  {
    icon: Shield,
    badge: "STUDENT PRIVACY",
    title: "FERPA & Minor Safety",
    desc: "Academic transcripts and minor student records are protected with strict compliance controls and zero public web indexing.",
  },
  {
    icon: Lock,
    badge: "DATA ISOLATION",
    title: "School Roster Sovereignty",
    desc: "Coaching evaluations, recruiting records, and shortlists are cryptographically isolated to your verified institution.",
  },
  {
    icon: FileText,
    badge: "DOCUMENT INTEGRITY",
    title: "Admin Review Pipeline",
    desc: "Transcripts, physicals, and eligibility filings undergo manual review by platform administrators before publication.",
  },
];

export default function AboutPage() {
  return (
    <>
      {/* Page Hero */}
      <section className="py-16 sm:py-20 px-[6%] bg-[#f4f7fc] border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto">
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
            <span>OUR PURPOSE</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold text-[#102341] tracking-tight leading-tight mb-4 max-w-3xl">
            Potential deserves a pathway.
          </h1>
          <p className="text-base sm:text-lg text-[#65748a] leading-relaxed max-w-2xl">
            We believe the right connection can open an entirely new chapter. The Recruiting Standard
            is built to bring clarity, verified accuracy, and institutional integrity to school
            athletic recruiting.
          </p>
        </div>
      </section>

      {/* Story */}
      <AboutStory />

      {/* Values */}
      <AboutValues />

      <section className="py-8 px-[6%] bg-white">
        <div className="max-w-7xl mx-auto">
          <div
            className="min-h-[400px] rounded-3xl relative overflow-hidden flex items-end p-8 sm:p-12 shadow-lg"
            style={{
              backgroundImage:
                "linear-gradient(to top, rgba(11, 29, 57, 0.94) 0%, rgba(11, 29, 57, 0.5) 50%, rgba(11, 29, 57, 0.15) 100%), url('/about-banner.jpg')",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div className="relative z-10 max-w-2xl text-white">
              <span className="text-[10px] font-bold tracking-widest text-[#bed8ff] uppercase block mb-3 font-mono">
                RAISING THE STANDARD
              </span>
              <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-white mb-3 leading-tight">
                Built on trust. Grounded in verification.
              </h2>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed m-0">
                High school athletic programs and college coaches deserve recruiting data they can
                rely on without spending weeks verifying basic eligibility.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* The Verification Standard: Problem & Solution Comparison */}
      <section className="py-20 px-[6%] bg-[#f4f7fc]/70 border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200 text-[#102341] text-xs font-semibold uppercase tracking-wider mb-3">
                <span>Verification Threshold</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-semibold text-[#102341] tracking-tight mb-4 leading-tight">
                Why self-reported metrics are holding recruiting back.
              </h2>
              <p className="text-sm sm:text-base text-[#65748a] leading-relaxed mb-6">
                Open marketplaces rely on self-reported stats and unvetted videos. Coaches waste weeks
                scouting prospects only to find academic or eligibility disqualifications later. We
                solve this by requiring verified documentation upfront.
              </p>
              <SiteLink
                href="/features"
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#102341] hover:text-slate-600 transition-colors"
              >
                <span>Explore the full feature architecture</span>
                <ArrowRight className="w-4 h-4" />
              </SiteLink>
            </div>

            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Card 1: Traditional */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs">
                <div className="flex items-center gap-2 text-slate-500 mb-3">
                  <AlertCircle className="w-4 h-4 text-slate-400" />
                  <span className="text-[10px] font-bold tracking-wider uppercase font-mono">Traditional Model</span>
                </div>
                <h3 className="text-base font-semibold text-[#102341] mb-3">Unverified Databases</h3>
                <ul className="space-y-2.5 text-xs text-[#65748a] leading-relaxed">
                  <li className="flex items-start gap-2">
                    <span className="text-slate-400 font-bold">✕</span>
                    <span>Self-reported metrics with zero administrator review</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-slate-400 font-bold">✕</span>
                    <span>Unconfirmed transcripts and sudden eligibility issues</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-slate-400 font-bold">✕</span>
                    <span>Leaked prospect boards and zero school privacy</span>
                  </li>
                </ul>
              </div>

              {/* Card 2: The Recruiting Standard */}
              <div className="bg-[#102341] text-white rounded-2xl p-6 shadow-sm border border-[#102341] relative">
                <div className="flex items-center gap-2 text-[#bed8ff] mb-3">
                  <CheckCircle2 className="w-4 h-4 text-[#bed8ff]" />
                  <span className="text-[10px] font-bold tracking-wider uppercase font-mono">The Recruiting Standard</span>
                </div>
                <h3 className="text-base font-semibold text-white mb-3">Verified Network</h3>
                <ul className="space-y-2.5 text-xs text-slate-300 leading-relaxed">
                  <li className="flex items-start gap-2">
                    <span className="text-[#bed8ff] font-bold">✓</span>
                    <span className="text-white">Only approved athletes with verified records appear in search</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#bed8ff] font-bold">✓</span>
                    <span className="text-white">Private, isolated recruiting records and coach evaluations</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#bed8ff] font-bold">✓</span>
                    <span className="text-white">Permanent unique School ID for institutional sovereignty</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Institutional Governance Section */}
      <section className="py-20 px-[6%] bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-[#102341] text-xs font-semibold uppercase tracking-wider mb-3">
              <span>Governance &amp; Privacy</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-semibold text-[#102341] tracking-tight mb-3">
              Uncompromising data privacy.
            </h2>
            <p className="text-sm sm:text-base text-[#65748a] leading-relaxed">
              We operate with strict institutional boundaries so schools, coaches, and families can
              collaborate with confidence.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {governanceCards.map((card) => {
              const IconComponent = card.icon;
              return (
                <div
                  key={card.title}
                  className="bg-[#f4f7fc]/60 rounded-2xl p-7 border border-slate-200/80 hover:border-blue-300 hover:bg-white hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-2xs">
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-mono font-bold text-[#65748a] uppercase tracking-wider">
                      {card.badge}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-[#102341] mb-2">{card.title}</h3>
                  <p className="text-xs sm:text-sm text-[#65748a] leading-relaxed">{card.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Mission Closing */}
      <section className="py-20 px-[6%] bg-[#f4f7fc] relative overflow-hidden border-t border-slate-200/80">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200 text-[#102341] text-xs font-semibold uppercase tracking-wider mb-4">
            <span>WHERE WE ARE HEADED</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-[#102341] tracking-tight leading-tight mb-6 max-w-2xl">
            A platform built for people, <br />
            not just <em className="not-italic text-blue-900 font-normal">profiles.</em>
          </h2>
          <div>
            <SiteLink
              href="/features"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-[#102341] text-white font-bold text-xs sm:text-sm hover:bg-[#1d3d68] transition-colors shadow-sm"
            >
              <span>See How the Platform Works</span>
              <ArrowRight className="w-4 h-4 text-[#bed8ff]" />
            </SiteLink>
          </div>
        </div>
        <span className="absolute -right-10 top-0 text-[260px] text-blue-100/60 leading-none select-none pointer-events-none z-0">
          ✳
        </span>
      </section>
    </>
  );
}
