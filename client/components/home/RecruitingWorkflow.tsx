import { Search, BookmarkCheck, MessageSquareText, CheckCheck } from "lucide-react";

const stages = [
  {
    step: "01",
    icon: Search,
    title: "Filter Approved Talent",
    desc: "Target verified prospects by sport, graduation year, position, and academic benchmarks.",
  },
  {
    step: "02",
    icon: BookmarkCheck,
    title: "Build Program Shortlists",
    desc: "Organize recruiting boards across high school classes and program depth chart needs.",
  },
  {
    step: "03",
    icon: MessageSquareText,
    title: "Log Inquiries & Visits",
    desc: "Maintain institutional contact logs of phone calls, unofficial visits, and staff notes.",
  },
  {
    step: "04",
    icon: CheckCheck,
    title: "Offers & Commitments",
    desc: "Track official scholarship offers, commitments, and transfer statuses in private.",
  },
];

export default function RecruitingWorkflow() {
  return (
    <section className="py-20 px-[6%] bg-white border-t border-slate-200/80">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-[#102341] text-xs font-semibold uppercase tracking-wider mb-3">
              <span>Recruiting Pipeline</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-semibold text-[#102341] tracking-tight">
              From discovery <br className="hidden sm:block" />
              <span className="text-[#65748a] font-normal">to official commitment.</span>
            </h2>
          </div>
          <p className="text-sm text-[#65748a] max-w-sm leading-relaxed">
            A structured workflow designed around how coaching staffs actually scout, evaluate, and
            sign student-athletes.
          </p>
        </div>

        {/* 4 Pipeline Step Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stages.map((stage) => {
            const IconComponent = stage.icon;
            return (
              <div
                key={stage.step}
                className="bg-[#f4f7fc]/50 hover:bg-white rounded-2xl p-6 border border-slate-200/80 hover:border-blue-300 hover:shadow-sm transition-all duration-200 relative group"
              >
                <div className="flex items-center justify-between mb-5">
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-2xs">
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-[#65748a]/70 tracking-widest font-mono">
                    {stage.step}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-[#102341] mb-2">{stage.title}</h3>
                <p className="text-xs sm:text-sm text-[#65748a] leading-relaxed">{stage.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
