import { ArrowRight } from "lucide-react";
import SiteLink from "@/components/ui/SiteLink";

const steps = [
  {
    title: "Create your school profile",
    desc: "Tell athletes who you are and what makes your program different.",
  },
  {
    title: "Discover with intention",
    desc: "Find student-athletes who align with your team and your school.",
  },
  {
    title: "Connect and build what’s next",
    desc: "Start a conversation. Explore the fit. Take the next step together.",
  },
];

export default function Pathway() {
  return (
    <section className="py-20 px-[6%] bg-white border-t border-slate-200/80">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Left: Image Card with Overlay */}
        <div
          className="min-h-[460px] rounded-3xl bg-cover bg-center relative overflow-hidden p-8 sm:p-10 flex items-end shadow-sm"
          style={{
            backgroundImage:
              "linear-gradient(0deg, rgba(11,29,57,0.85) 0%, rgba(11,29,57,0.2) 60%), url('https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=85')",
          }}
        >
          <span className="relative z-10 text-2xl sm:text-3xl font-bold tracking-tight text-white leading-tight">
            MORE THAN A GAME. <br />
            <span className="text-[#bed8ff]">A WAY FORWARD.</span>
          </span>
        </div>

        {/* Right: Pathway Steps */}
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-[#102341] text-xs font-semibold uppercase tracking-wider mb-3">
            <span>From First Look to the Right Fit</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-semibold text-[#102341] tracking-tight leading-tight mb-3">
            A clearer path. <br />
            <span className="text-[#65748a] font-normal">A stronger next step.</span>
          </h2>
          <p className="text-sm sm:text-base text-[#65748a] leading-relaxed mb-8">
            Spend less time piecing things together and more time building your program.
          </p>

          <div className="space-y-4 mb-8">
            {steps.map(({ title, desc }, i) => (
              <div
                key={title}
                className="flex items-start gap-4 p-4 rounded-xl bg-[#f8fafc] border border-slate-200/70"
              >
                <span className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-xs font-bold text-[#102341] shrink-0 shadow-2xs">
                  0{i + 1}
                </span>
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-[#102341] mb-1">{title}</h3>
                  <p className="text-xs sm:text-sm text-[#65748a] leading-relaxed m-0">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <SiteLink
            href="/features"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#102341] hover:text-blue-700 transition-colors"
          >
            <span>Get to know the process</span>
            <ArrowRight className="w-4 h-4 text-[#65748a]" />
          </SiteLink>
        </div>
      </div>
    </section>
  );
}
