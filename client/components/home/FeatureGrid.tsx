import { Compass, Filter, Send, ArrowRight } from "lucide-react";
import SiteLink from "@/components/ui/SiteLink";

const features = [
  {
    num: "01",
    icon: Compass,
    title: "See beyond the highlight reel",
    desc: "Discover athletic ability, verified academic ambition, and the complete person behind the performance.",
  },
  {
    num: "02",
    icon: Filter,
    title: "Find your program's kind of talent",
    desc: "Target profiles by sport, graduation year, position, and academic needs. Build prospect boards with purpose.",
  },
  {
    num: "03",
    icon: Send,
    title: "Initiate direct institutional dialogue",
    desc: "Move from a promising verified profile to honest conversations between coaching staff and student-athletes.",
  },
];

export default function FeatureGrid() {
  return (
    <section className="py-16 px-[6%] bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map(({ num, icon: IconComponent, title, desc }) => (
            <article
              key={num}
              className="bg-[#f4f7fc]/70 rounded-2xl p-7 border border-slate-200/80 hover:border-blue-300 hover:bg-white hover:shadow-md transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-2xs">
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-mono font-bold text-[#65748a]/80">{num}</span>
                </div>
                <h3 className="text-lg font-semibold text-[#102341] mb-2 leading-snug">{title}</h3>
                <p className="text-xs sm:text-sm text-[#65748a] leading-relaxed mb-6">{desc}</p>
              </div>

              <div className="pt-4 border-t border-slate-200/60">
                <SiteLink
                  href="/features"
                  className="inline-flex items-center justify-between w-full text-xs font-semibold text-[#102341] hover:text-blue-700 transition-colors"
                >
                  <span>Explore capabilities</span>
                  <ArrowRight className="w-4 h-4 text-[#65748a]" />
                </SiteLink>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
