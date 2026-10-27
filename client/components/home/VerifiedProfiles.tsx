import { ShieldCheck, FileCheck2, Activity, Lock, CheckCircle2, ArrowRight } from "lucide-react";
import SiteLink from "@/components/ui/SiteLink";

export default function VerifiedProfiles() {
  return (
    <section className="py-20 px-[6%] bg-white border-y border-slate-200/70">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="max-w-2xl mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-[#102341] text-xs font-semibold uppercase tracking-wider mb-3">
            <ShieldCheck className="w-4 h-4 text-slate-700" />
            <span>Document Verification</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-semibold text-[#102341] tracking-tight leading-tight mb-4">
            Verified from day one. <br className="hidden sm:block" />
            <span className="text-[#65748a] font-normal">Recruit with total clarity.</span>
          </h2>
          <p className="text-sm sm:text-base text-[#65748a] leading-relaxed">
            We replace unvetted claims with reviewed academic transcripts, combine testing metrics,
            and official eligibility documents before any athlete appears in discovery.
          </p>
        </div>

        {/* 2-Column Showcase */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left: Minimalist Feature Cards */}
          <div className="lg:col-span-6 space-y-3.5">
            <div className="bg-[#f8fafc] p-6 rounded-2xl border border-slate-200/70 hover:border-slate-300 hover:bg-white hover:shadow-xs transition-all duration-200 flex items-start gap-4">
              <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 shrink-0 shadow-2xs">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-semibold text-[#102341] mb-1">
                  Academic Transcripts &amp; GPA
                </h3>
                <p className="text-xs sm:text-sm text-[#65748a] leading-relaxed">
                  Official school records reviewed by platform administrators to ensure student-athletes meet academic thresholds.
                </p>
              </div>
            </div>

            <div className="bg-[#f8fafc] p-6 rounded-2xl border border-slate-200/70 hover:border-slate-300 hover:bg-white hover:shadow-xs transition-all duration-200 flex items-start gap-4">
              <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 shrink-0 shadow-2xs">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-semibold text-[#102341] mb-1">
                  Multi-Sport Verified Metrics
                </h3>
                <p className="text-xs sm:text-sm text-[#65748a] leading-relaxed">
                  Consolidated game statistics, graduation timeline, and linked video highlight reels across all varsity sports.
                </p>
              </div>
            </div>

            <div className="bg-[#f8fafc] p-6 rounded-2xl border border-slate-200/70 hover:border-slate-300 hover:bg-white hover:shadow-xs transition-all duration-200 flex items-start gap-4">
              <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 shrink-0 shadow-2xs">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-semibold text-[#102341] mb-1">
                  Private Signed URLs
                </h3>
                <p className="text-xs sm:text-sm text-[#65748a] leading-relaxed">
                  Zero public document exposure. Student records are accessed exclusively via authenticated, short-lived signed links.
                </p>
              </div>
            </div>

            <div className="pt-2">
              <SiteLink
                href="/features"
                className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#102341] hover:text-slate-600 transition-colors"
              >
                <span>Learn more about verification standards</span>
                <ArrowRight className="w-4 h-4" />
              </SiteLink>
            </div>
          </div>

          {/* Right: Redesigned Minimalist Profile Card */}
          <div className="lg:col-span-6">
            <div className="bg-white rounded-2xl border border-slate-200/90 p-7 sm:p-8 shadow-[0_4px_24px_rgba(16,35,65,0.04)] relative">
              {/* Header Status & Class */}
              <div className="flex items-center justify-between pb-5 border-b border-slate-100">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-800 text-[11px] font-medium border border-slate-200/70">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  <span>Approved Prospect</span>
                </div>
                <span className="text-xs text-slate-500 font-medium">Class of 2026 · Basketball</span>
              </div>

              {/* Athlete Identity */}
              <div className="flex items-center gap-3.5 my-6">
                <div className="w-12 h-12 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-bold tracking-tight shrink-0 shadow-2xs">
                  MV
                </div>
                <div>
                  <h4 className="text-lg font-bold text-[#102341] leading-snug">Marcus Vance</h4>
                  <p className="text-xs text-[#65748a]">Point Guard · Oakridge Academy</p>
                </div>
              </div>

              {/* Minimal Progress Line */}
              <div className="space-y-1.5 mb-6">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600 font-medium">Profile Verification</span>
                  <span className="text-slate-900 font-semibold">100% Completed</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-slate-900 rounded-full w-full" />
                </div>
              </div>

              {/* Minimalist 3-Stat Strip with Hairline Dividers */}
              <div className="grid grid-cols-3 divide-x divide-slate-100 bg-[#f8fafc] border border-slate-200/70 rounded-xl py-3.5 px-2 text-center mb-6">
                <div>
                  <div className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">3.85</div>
                  <div className="text-[10px] text-slate-500 uppercase font-medium tracking-wider mt-0.5">GPA</div>
                </div>
                <div>
                  <div className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">6&apos;3&quot;</div>
                  <div className="text-[10px] text-slate-500 uppercase font-medium tracking-wider mt-0.5">Height</div>
                </div>
                <div>
                  <div className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">18.4</div>
                  <div className="text-[10px] text-slate-500 uppercase font-medium tracking-wider mt-0.5">PPG</div>
                </div>
              </div>

              {/* Verified Records List */}
              <div className="pt-4 border-t border-slate-100 space-y-2.5">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                  Verified Records (3 of 3 Verified)
                </div>
                <div className="flex items-center justify-between text-xs text-slate-700">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-slate-900" />
                    <span>Junior Year Official Transcript</span>
                  </span>
                  <span className="text-slate-500 font-medium">Verified</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-700">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-slate-900" />
                    <span>State Combine Athletic Metrics</span>
                  </span>
                  <span className="text-slate-500 font-medium">Verified</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-700">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-slate-900" />
                    <span>Certified Hudl Game Highlights</span>
                  </span>
                  <span className="text-slate-500 font-medium">Verified</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
