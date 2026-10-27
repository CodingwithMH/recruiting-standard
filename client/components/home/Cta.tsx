import { ArrowUpRight } from "lucide-react";
import SiteLink from "@/components/ui/SiteLink";

export default function Cta() {
  return (
    <section className="py-16 sm:py-20 px-[6%] bg-[#bed8ff] text-[#102341]">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-8">
        <div>
          <span className="text-[10px] font-bold tracking-widest text-[#102341]/80 uppercase block mb-3 font-mono">
            YOUR NEXT CHAPTER STARTS WITH A CONNECTION
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight leading-tight m-0">
            Build the team. <br className="hidden sm:block" />
            Raise the standard.
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
  );
}
