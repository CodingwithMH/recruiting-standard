import { ArrowUpRight, Plus } from "lucide-react";
import SiteLink from "@/components/ui/SiteLink";

const faqs = [
  {
    q: "Who is MVP 4.18 for?",
    a: "The platform is designed for schools, coaches, and student-athletes looking for a more focused way to connect around athletic and academic opportunities.",
  },
  {
    q: "How can my school join?",
    a: "Complete the school registration form with your institution and role. School access will become available when our onboarding service launches.",
  },
  {
    q: "Which sports are supported?",
    a: "We’re building for programs across multiple sports. Share your sport and recruiting needs during registration so we can discuss the right fit.",
  },
  {
    q: "Does a connection guarantee an offer?",
    a: "No. Schools manage their own evaluation, admissions, and recruiting decisions. The platform helps make introductions and conversations easier.",
  },
];

export default function Faq() {
  return (
    <section className="py-20 px-[6%] bg-white border-t border-slate-200/80">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-[#102341] text-xs font-semibold uppercase tracking-wider mb-3">
            <span>Good Questions. Clear Answers.</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-semibold text-[#102341] tracking-tight leading-tight mb-4">
            A little more <br />
            <span className="text-[#65748a] font-normal">before you start.</span>
          </h2>
          <SiteLink
            href="/contact"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#102341] hover:text-blue-700 transition-colors"
          >
            <span>Talk to our team</span>
            <ArrowUpRight className="w-4 h-4 text-[#65748a]" />
          </SiteLink>
        </div>

        <div className="lg:col-span-7 space-y-2">
          {faqs.map(({ q, a }) => (
            <details
              key={q}
              className="group border-b border-slate-200 py-4 transition-colors"
            >
              <summary className="flex items-center justify-between text-base font-semibold text-[#102341] cursor-pointer list-none py-1 hover:text-blue-700">
                <span>{q}</span>
                <span className="w-6 h-6 rounded-full bg-slate-100 group-open:rotate-45 transition-transform flex items-center justify-center text-slate-700 shrink-0 ml-4">
                  <Plus className="w-3.5 h-3.5" />
                </span>
              </summary>
              <p className="pt-3 text-xs sm:text-sm text-[#65748a] leading-relaxed pr-6">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
