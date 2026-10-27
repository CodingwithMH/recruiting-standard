import type { Metadata } from "next";
import { GraduationCap, ShieldCheck, Search, FileText, Check, ArrowUpRight, ArrowLeft } from "lucide-react";
import SiteLink from "@/components/ui/SiteLink";
import HowItWorks from "@/components/features/HowItWorks";

export const metadata: Metadata = {
  title: "Features & Architecture",
  description:
    "Explore the complete feature suite of MVP 4.18: verified multi-sport athlete profiles, approved-athlete search, and isolated recruiting records.",
};

const featureDeepDives = [
  {
    icon: GraduationCap,
    tag: "ATHLETE PROFILES",
    title: "Multi-Sport Profiles Built for Real Evaluation",
    desc: "Record statistics across multiple varsity sports, combine testing metrics, academic standings, and video links in one place.",
    bullets: [
      "Multi-sport stats and graduation year tags",
      "Official academic info, GPA, and graduation timeline",
      "Direct video links (Hudl, YouTube, Vimeo)",
      "Profile completion indicator (0–100%)",
    ],
  },
  {
    icon: ShieldCheck,
    tag: "DOCUMENT INTEGRITY",
    title: "Admin Review & Signed Document Storage",
    desc: "Official transcripts and eligibility forms undergo platform administrator review. Documents are stored in secure private storage.",
    bullets: [
      "Reviewer approval queue with timestamped notes",
      "Three-tier document status: Pending, Approved, or Rejected",
      "Short-lived signed URLs for authorized coaching staff",
      "Strict data isolation guaranteeing student privacy",
    ],
  },
  {
    icon: Search,
    tag: "DISCOVERY & SEARCH",
    title: "Approved-Athlete Search & Filter Engine",
    desc: "Coaches never sift through unvetted accounts. Our discovery engine restricts search exclusively to verified athletes.",
    bullets: [
      "Filter by Sport, Graduation Year, Position, and Academic Eligibility",
      "Zero unvetted or duplicate athlete profiles in search",
      "Save promising prospects directly to your school recruiting boards",
      "Fast, indexed search built for high school and college programs",
    ],
  },
  {
    icon: FileText,
    tag: "RECRUITING RECORDS",
    title: "Private Activity Logs & Offer Management",
    desc: "Maintain institutional logs of calls, campus visits, scholarship offers, and student commitments with strict school-level data isolation.",
    bullets: [
      "Contact logs tracking dates, communications, and coach impressions",
      "Offer, commitment, and transfer status tracking",
      "Private coaching notes cryptographically shielded from competing programs",
      "Seamless record preservation across coaching staff transitions",
    ],
  },
];

export default function FeaturesPage() {
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
            <span>THE PLATFORM IN DEPTH</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold text-[#102341] tracking-tight leading-tight mb-4 max-w-3xl">
            From potential to possibility.
          </h1>
          <p className="text-base sm:text-lg text-[#65748a] leading-relaxed max-w-2xl">
            One focused place to discover talent, verify academic and athletic credentials, and manage
            institutional recruiting records with complete confidentiality.
          </p>
        </div>
      </section>

      {/* High-level 4-step grid */}
      <HowItWorks />

      {/* Visual Photo Banner */}
      <section className="py-8 px-[6%] bg-white">
        <div className="max-w-7xl mx-auto">
          <div
            className="min-h-[380px] rounded-3xl relative overflow-hidden flex items-end p-8 sm:p-12 bg-cover bg-center shadow-sm"
            style={{
              backgroundImage:
                "linear-gradient(180deg, rgba(11, 29, 57, 0.2) 20%, rgba(11, 29, 57, 0.92) 100%), url('https://images.unsplash.com/photo-1566577739112-5180d4bf9390?auto=format&fit=crop&w=1400&q=85')",
            }}
          >
            <div className="relative z-10 max-w-2xl text-white">
              <span className="text-[10px] font-bold tracking-widest text-[#bed8ff] uppercase block mb-2 font-mono">
                ACCELERATING PROGRAM SUCCESS
              </span>
              <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-white mb-3">
                Tools designed specifically for coaching staffs.
              </h2>
              <p className="text-sm sm:text-base text-slate-200 leading-relaxed m-0">
                Eliminate administrative chaos with dedicated prospect boards, private evaluation notes,
                and verified student documentation all under your permanent School ID.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Deep Dives into Core Features */}
      <section className="py-20 px-[6%] bg-[#f4f7fc]/70 border-t border-slate-200/80">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mb-12">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-[#102341] text-xs font-semibold uppercase tracking-wider mb-3">
              <span>Capabilities Breakdown</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-semibold text-[#102341] tracking-tight mb-3">
              Engineered for recruiting excellence.
            </h2>
            <p className="text-sm sm:text-base text-[#65748a] leading-relaxed">
              Every feature in MVP 4.18 addresses specific pain points in the athletic
              recruitment lifecycle.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {featureDeepDives.map((feat) => {
              const IconComponent = feat.icon;
              return (
                <div
                  key={feat.tag}
                  className="bg-white rounded-2xl p-7 border border-slate-200/80 hover:border-blue-300 hover:shadow-md transition-all duration-200 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-2xs">
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-mono font-bold text-[#65748a] uppercase tracking-wider bg-slate-100 px-2.5 py-0.5 rounded-md">
                        {feat.tag}
                      </span>
                    </div>

                    <h3 className="text-lg font-semibold text-[#102341] mb-2">{feat.title}</h3>
                    <p className="text-xs sm:text-sm text-[#65748a] leading-relaxed mb-6">
                      {feat.desc}
                    </p>

                    <div className="pt-4 border-t border-slate-100">
                      <span className="text-[10px] font-bold text-[#65748a] uppercase tracking-wider block mb-2">
                        Key Capabilities
                      </span>
                      <ul className="space-y-2">
                        {feat.bullets.map((b) => (
                          <li key={b} className="flex items-start gap-2 text-xs text-[#102341]">
                            <Check className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-16 sm:py-20 px-[6%] bg-[#bed8ff] text-[#102341]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-8">
          <div>
            <span className="text-[10px] font-bold tracking-widest text-[#102341]/80 uppercase block mb-3 font-mono">
              READY TO FIND YOUR NEXT ATHLETE?
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight leading-tight m-0">
              Start with a profile. <br className="hidden sm:block" />
              Build from there.
            </h2>
          </div>
          <SiteLink
            href="/school-registration"
            className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full bg-[#102341] text-white font-bold text-xs sm:text-sm hover:bg-[#1d3d68] transition-colors shadow-sm shrink-0"
          >
            <span>Join as a school</span>
            <ArrowUpRight className="w-4 h-4 text-[#bed8ff]" />
          </SiteLink>
        </div>
      </section>
    </>
  );
}
