import { ArrowUpRight } from "lucide-react";
import SiteLink from "@/components/ui/SiteLink";

export default function AboutStory() {
  return (
    <section className="py-20 px-[6%] bg-white border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-6">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-[#102341] tracking-tight leading-tight">
            Better recruiting starts <br />
            <span className="text-[#65748a] font-normal">with seeing the whole person.</span>
          </h2>
        </div>
        <div className="lg:col-span-6 space-y-5">
          <p className="text-sm sm:text-base text-[#65748a] leading-relaxed">
            A great match goes far beyond a position on a roster. It brings together athletic goals,
            academic preparedness, school culture, and the personal ambition of the student-athlete.
          </p>
          <p className="text-sm sm:text-base text-[#65748a] leading-relaxed">
            Our purpose is straightforward: give school programs and student-athletes a transparent,
            verified space to connect with confidence. We replace hearsay and unvetted highlight tapes
            with official transcripts, verified metrics, and private recruitment records.
          </p>
          <div className="pt-2">
            <SiteLink
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-[#102341] text-white font-bold text-xs sm:text-sm hover:bg-[#1d3d68] transition-colors shadow-sm"
              href="/features"
            >
              <span>Explore How It Works</span>
              <ArrowUpRight className="w-4 h-4 text-[#bed8ff]" />
            </SiteLink>
          </div>
        </div>
      </div>
    </section>
  );
}
