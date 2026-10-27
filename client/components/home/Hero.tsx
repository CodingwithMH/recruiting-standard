import { ArrowRight, ArrowUpRight } from "lucide-react";
import SiteLink from "@/components/ui/SiteLink";

export default function Hero() {
  return (
    <section className="grid grid-cols-1 lg:grid-cols-2 bg-[#f4f7fc] min-h-[660px] border-b border-slate-200/80">
      {/* Left Column: Copy & CTAs */}
      <div className="p-8 sm:p-14 lg:p-20 flex flex-col justify-center">
        <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-[#102341] mb-5">
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
          <span>A NEW STANDARD IN ATHLETIC RECRUITING</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold text-[#102341] tracking-tight leading-[1.08] mb-6">
          Big potential. <br />
          Right place. <br />
          <em className="font-normal text-blue-900 not-italic">Your next chapter.</em>
        </h1>

        <p className="text-sm sm:text-base text-[#65748a] leading-relaxed max-w-md mb-8">
          Connecting ambitious student-athletes with schools that see what&apos;s possible. Less
          noise. Better connections. More opportunity.
        </p>

        <div className="flex flex-wrap items-center gap-4 mb-10">
          <SiteLink
            href="/school-registration"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-[#102341] text-white font-bold text-xs sm:text-sm hover:bg-[#1d3d68] transition-all shadow-sm"
          >
            <span>Find your next recruit</span>
            <ArrowUpRight className="w-4 h-4 text-[#bed8ff]" />
          </SiteLink>
          <SiteLink
            href="/features"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#102341] hover:text-blue-700 transition-colors py-2"
          >
            <span>See how it works</span>
            <ArrowRight className="w-4 h-4 text-[#65748a]" />
          </SiteLink>
        </div>

        <div className="flex items-center gap-4 pt-6 border-t border-slate-200/70">
          <div className="flex -space-x-2">
            <span className="w-8 h-8 rounded-full border-2 border-[#f4f7fc] bg-slate-300 flex items-center justify-center text-[10px] font-bold text-slate-800">
              AK
            </span>
            <span className="w-8 h-8 rounded-full border-2 border-[#f4f7fc] bg-slate-400 flex items-center justify-center text-[10px] font-bold text-white">
              JM
            </span>
            <span className="w-8 h-8 rounded-full border-2 border-[#f4f7fc] bg-slate-500 flex items-center justify-center text-[10px] font-bold text-white">
              SL
            </span>
          </div>
          <p className="text-xs text-[#65748a] leading-snug m-0">
            <strong className="text-[#102341] block">Built around people.</strong>
            Designed for the possibilities ahead.
          </p>
        </div>
      </div>

      {/* Right Column: Hero Visual with Athlete Spotlight Card */}
      <div
        className="relative min-h-[480px] lg:min-h-full bg-[#213d64] bg-[url('/high-school-boys-hero.png')] bg-cover bg-center overflow-hidden flex items-end p-6 sm:p-10"
        role="img"
        aria-label="Three high school boys in navy soccer uniforms on a school field"
      >
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b1d39]/90 via-[#0b1d39]/30 to-transparent" />
        <span className="absolute top-6 left-6 text-[10px] text-white/80 font-mono tracking-widest uppercase">
          THE WORK TODAY. THE OPPORTUNITY TOMORROW.
        </span>

        {/* Floating Athlete Spotlight Card */}
        <div className="relative z-10 w-full sm:w-72 bg-white/95 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/60 -rotate-2 hover:rotate-0 transition-transform duration-300">
          <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-3">
            <span className="flex items-center gap-1.5 text-blue-700">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600" /> ATHLETE SPOTLIGHT
            </span>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
          </div>

          <h3 className="text-lg font-bold text-[#102341] leading-snug mb-3">
            The next name <br />
            on your roster.
          </h3>

          <div className="flex flex-wrap gap-1.5 mb-4">
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-medium">
              Talent
            </span>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-medium">
              Academics
            </span>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-medium">
              Ambition
            </span>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-800">
            <span>Discover the whole athlete</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </div>
        </div>

        <div className="absolute bottom-6 right-6 text-xs text-white/70 font-mono tracking-wider hidden sm:block">
          01 <span className="text-[10px] text-white/50 tracking-widest">/ THE NEXT CHAPTER</span>
        </div>
      </div>
    </section>
  );
}
