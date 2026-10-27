import { UserPlus, FileCheck, Search, ShieldCheck, ArrowUpRight } from "lucide-react";
import SiteLink from "@/components/ui/SiteLink";

const steps = [
  {
    num: "01",
    icon: UserPlus,
    title: "Create a verified profile",
    desc: "Athletes and school programs build comprehensive profiles showcasing academics, sports statistics, and game highlights.",
  },
  {
    num: "02",
    icon: FileCheck,
    title: "Administrative verification",
    desc: "Transcripts, test scores, and eligibility forms are reviewed by platform administrators before publication.",
  },
  {
    num: "03",
    icon: Search,
    title: "Precision discovery",
    desc: "Coaches filter approved athletes by graduation year, sport, position, and academic benchmarks to build dedicated shortlists.",
  },
  {
    num: "04",
    icon: ShieldCheck,
    title: "Isolated recruiting records",
    desc: "Log outreach, campus visits, scholarship offers, and commitments inside an isolated school dashboard.",
  },
];

export default function HowItWorks() {
  return (
    <section className="py-16 px-[6%] bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map(({ num, icon: IconComponent, title, desc }) => (
            <article
              key={num}
              className="bg-[#f4f7fc]/60 rounded-2xl p-6 border border-slate-200/80 hover:border-blue-300 hover:bg-white hover:shadow-md transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-2xs">
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-mono font-bold text-[#65748a]">{num}</span>
                </div>
                <h3 className="text-base font-semibold text-[#102341] mb-2">{title}</h3>
                <p className="text-xs sm:text-sm text-[#65748a] leading-relaxed">{desc}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-10 text-center">
          <SiteLink className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-[#102341] text-white font-bold text-xs sm:text-sm hover:bg-[#1d3d68] transition-colors shadow-sm" href="/school-registration">
            <span>Register Your School</span>
            <ArrowUpRight className="w-4 h-4 text-[#bed8ff]" />
          </SiteLink>
        </div>
      </div>
    </section>
  );
}
