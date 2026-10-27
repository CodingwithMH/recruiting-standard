import { ArrowUpRight } from "lucide-react";
import SiteLink from "@/components/ui/SiteLink";

export default function Mission() {
  return (
    <section className="py-20 px-[6%] bg-[#f4f7fc] relative overflow-hidden border-t border-slate-200/80">
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-[#102341] text-xs font-semibold uppercase tracking-wider mb-4 border border-slate-200">
          <span>A Higher Standard. A More Human Approach.</span>
        </div>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-[#102341] tracking-tight leading-tight mb-6 max-w-2xl">
          Because the right opportunity <br />
          can change <em className="not-italic text-blue-900 font-normal">everything.</em>
        </h2>
        <div>
          <SiteLink
            href="/about"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-[#102341] text-white font-bold text-xs sm:text-sm hover:bg-[#1d3d68] transition-colors shadow-sm"
          >
            <span>Our story</span>
            <ArrowUpRight className="w-4 h-4 text-[#bed8ff]" />
          </SiteLink>
        </div>
      </div>

      {/* Decorative asterisk — subtle brand mark */}
      <span
        className="absolute -right-10 top-0 text-[260px] text-blue-100/60 leading-none select-none pointer-events-none z-0"
        aria-hidden="true"
      >
        ✳
      </span>
    </section>
  );
}
