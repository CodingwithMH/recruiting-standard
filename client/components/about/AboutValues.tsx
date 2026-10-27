import { ShieldCheck, Lock, MessageSquare } from "lucide-react";

const values = [
  {
    standard: "01 / INTEGRITY",
    icon: ShieldCheck,
    label: "Verified Credentials",
    desc: "Every metric, transcript, and eligibility record is verified by platform administrators before an athlete appears in discovery.",
  },
  {
    standard: "02 / SOVEREIGNTY",
    icon: Lock,
    label: "Institutional Isolation",
    desc: "School recruiting records, evaluations, and shortlists belong exclusively to your school and can never be viewed by rival programs.",
  },
  {
    standard: "03 / PURPOSE",
    icon: MessageSquare,
    label: "Direct Human Dialog",
    desc: "We build tools to empower coaches and families to engage in honest, meaningful conversations about athletic and academic fit.",
  },
];

export default function AboutValues() {
  return (
    <section className="py-16 px-[6%] bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {values.map(({ standard, icon: IconComponent, label, desc }) => (
            <article
              key={label}
              className="bg-[#f4f7fc]/70 rounded-2xl p-7 border border-slate-200/80 hover:border-blue-300 hover:bg-white hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-center justify-between mb-5">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-2xs">
                  <IconComponent className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono font-bold text-[#65748a] uppercase tracking-wider">
                  {standard}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-[#102341] mb-2">{label}</h3>
              <p className="text-xs sm:text-sm text-[#65748a] leading-relaxed">{desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
