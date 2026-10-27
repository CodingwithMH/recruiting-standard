"use client";

import { Check, ArrowUpRight, ShieldCheck, Zap } from "lucide-react";
import SiteLink from "@/components/ui/SiteLink";

const plans = [
  {
    id: "annual",
    label: "Annual Plan",
    badge: "BEST VALUE",
    price: "$1,500",
    period: "/ year",
    billing: "One annual institutional invoice",
    desc: "Complete year-round recruitment access for your entire athletic program.",
    featured: true,
    items: [
      "Permanent unique School ID",
      "Unlimited coaching staff accounts",
      "Full approved athlete search",
      "Private recruiting boards and contact logs",
      "Private signed document access",
      "Priority administrative onboarding",
    ],
  },
  {
    id: "monthly",
    label: "Monthly Plan",
    badge: "FLEXIBLE",
    price: "$250",
    period: "/ month",
    billing: "Billed monthly, cancel anytime",
    desc: "Targeted seasonal access with full portal capabilities, month to month.",
    featured: false,
    items: [
      "Permanent unique School ID",
      "Unlimited coaching staff accounts",
      "Full approved athlete search",
      "Private recruiting boards and contact logs",
      "Private signed document access",
      "Standard platform support",
    ],
  },
];

export default function PricingSection() {
  return (
    <div className="max-w-6xl mx-auto">
      <p className="text-center text-xs text-[#65748a] mb-10 max-w-md mx-auto leading-relaxed">
        All subscriptions are invoiced manually via institutional purchase order or ACH. No credit card required.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={plan.featured
              ? "relative rounded-3xl p-8 flex flex-col border bg-[#102341] text-white border-[#102341] shadow-xl"
              : "relative rounded-3xl p-8 flex flex-col border bg-white text-[#102341] border-slate-200/80 shadow-sm"}
          >
            <div className="flex items-center justify-between mb-6">
              <span className={plan.featured ? "text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full bg-white/10 text-[#bed8ff]" : "text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full bg-slate-100 text-[#65748a]"}>
                {plan.badge}
              </span>
              {plan.featured && <Zap className="w-4 h-4 text-[#bed8ff]" />}
            </div>
            <div className="mb-1">
              <span className={plan.featured ? "text-xs font-semibold uppercase tracking-wider text-slate-300" : "text-xs font-semibold uppercase tracking-wider text-[#65748a]"}>
                {plan.label}
              </span>
            </div>
            <div className="flex items-baseline gap-1.5 mb-1">
              <span className="text-5xl font-bold tracking-tight">{plan.price}</span>
              <span className={plan.featured ? "text-sm text-slate-300" : "text-sm text-[#65748a]"}>{plan.period}</span>
            </div>
            <p className={plan.featured ? "text-xs mb-1 text-[#bed8ff]" : "text-xs mb-1 text-[#65748a]"}>{plan.billing}</p>
            <p className={plan.featured ? "text-xs sm:text-sm leading-relaxed mb-6 text-slate-200" : "text-xs sm:text-sm leading-relaxed mb-6 text-[#65748a]"}>{plan.desc}</p>
            <div className={plan.featured ? "pt-5 border-t mb-7 flex-1 border-white/15" : "pt-5 border-t mb-7 flex-1 border-slate-100"}>
              <span className={plan.featured ? "text-[10px] font-bold uppercase tracking-wider block mb-3 text-[#bed8ff]" : "text-[10px] font-bold uppercase tracking-wider block mb-3 text-[#65748a]"}>
                Included:
              </span>
              <ul className="space-y-2.5">
                {plan.items.map((item) => (
                  <li key={item} className={plan.featured ? "flex items-start gap-2.5 text-xs text-slate-200" : "flex items-start gap-2.5 text-xs text-[#102341]"}>
                    <Check className={plan.featured ? "w-4 h-4 shrink-0 mt-0.5 text-[#bed8ff]" : "w-4 h-4 shrink-0 mt-0.5 text-slate-500"} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <SiteLink
              href="/school-registration"
              className={plan.featured ? "flex items-center justify-center gap-2 w-full py-3.5 px-6 rounded-full font-bold text-xs sm:text-sm bg-[#bed8ff] text-[#102341] hover:bg-white transition-all" : "flex items-center justify-center gap-2 w-full py-3.5 px-6 rounded-full font-bold text-xs sm:text-sm bg-[#102341] text-white hover:bg-[#1d3d68] transition-all"}
            >
              <span>Request School Access</span>
              <ArrowUpRight className={plan.featured ? "w-4 h-4 text-[#102341]" : "w-4 h-4 text-[#bed8ff]"} />
            </SiteLink>
          </div>
        ))}
        <div className="bg-[#f4f7fc] rounded-3xl p-8 border border-slate-200/80 flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 mb-5 shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold tracking-wider text-[#65748a] uppercase block mb-2">
              Institutional Procurement
            </span>
            <h3 className="text-lg font-bold text-[#102341] mb-3">Need an invoice quote?</h3>
            <p className="text-xs sm:text-sm text-[#65748a] leading-relaxed mb-6">
              Athletic departments often require vendor documentation or board approvals before finalizing payments. We accommodate all procurement workflows.
            </p>
            <ul className="space-y-3">
              {[
                "No recurring credit card charges, invoicing only",
                "Unlimited coaching staff under your School ID",
                "Switch between Monthly and Annual anytime",
              ].map((point) => (
                <li key={point} className="flex items-start gap-2.5 text-xs text-[#102341]">
                  <Check className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="pt-6 mt-6 border-t border-slate-200">
            <SiteLink
              href="/contact"
              className="flex items-center justify-center gap-2 w-full py-3 px-5 rounded-full border border-slate-300 text-[#102341] font-semibold text-xs sm:text-sm hover:bg-white hover:border-slate-400 transition-colors"
            >
              <span>Contact Admissions Team</span>
              <ArrowUpRight className="w-4 h-4 text-[#65748a]" />
            </SiteLink>
          </div>
        </div>
      </div>
    </div>
  );
}
