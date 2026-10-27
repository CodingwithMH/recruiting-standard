import { ShieldCheck, EyeOff, KeyRound, ArrowRight } from "lucide-react";
import SiteLink from "@/components/ui/SiteLink";

export default function SecuritySection() {
  return (
    <section className="py-20 px-[6%] bg-[#f8fafc]/80 border-t border-slate-200/80">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="max-w-2xl mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200 text-[#102341] text-xs font-semibold uppercase tracking-wider mb-3 shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-slate-700" />
            <span>Institutional Privacy</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#102341] mb-3">
            School data is isolated. <br className="hidden sm:block" />
            <span className="text-[#65748a] font-normal">Zero compromise.</span>
          </h2>
          <p className="text-sm sm:text-base text-[#65748a] leading-relaxed">
            Proprietary recruiting evaluations, prospect boards, and sensitive student transcripts
            remain strictly confidential to your athletic department.
          </p>
        </div>

        {/* 3 Minimalist Security Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white border border-slate-200/80 hover:border-slate-300 rounded-2xl p-7 shadow-2xs hover:shadow-xs transition-all duration-200">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-800 mb-5">
              <EyeOff className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-[#102341] mb-2">School Tenant Isolation</h3>
            <p className="text-xs sm:text-sm text-[#65748a] leading-relaxed">
              Recruiting records, private notes, and saved prospects from your school can never be
              viewed, queried, or inferred by competing programs.
            </p>
          </div>

          <div className="bg-white border border-slate-200/80 hover:border-slate-300 rounded-2xl p-7 shadow-2xs hover:shadow-xs transition-all duration-200">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-800 mb-5">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-[#102341] mb-2">Private Signed Documents</h3>
            <p className="text-xs sm:text-sm text-[#65748a] leading-relaxed">
              Official academic transcripts and eligibility forms are stored in private cloud storage
              with zero public web URLs—accessible only via signed tokens.
            </p>
          </div>

          <div className="bg-white border border-slate-200/80 hover:border-slate-300 rounded-2xl p-7 shadow-2xs hover:shadow-xs transition-all duration-200">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-800 mb-5">
              <KeyRound className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-[#102341] mb-2">Permanent School ID</h3>
            <p className="text-xs sm:text-sm text-[#65748a] leading-relaxed">
              Every approved school receives an immutable, permanent School ID that permanently anchors
              coaching staff authorizations and compliance history.
            </p>
          </div>
        </div>

        <div>
          <SiteLink
            href="/privacy-policy"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#102341] hover:text-slate-600 transition-colors"
          >
            <span>Read our institutional security &amp; privacy principles</span>
            <ArrowRight className="w-4 h-4 text-[#65748a]" />
          </SiteLink>
        </div>
      </div>
    </section>
  );
}
