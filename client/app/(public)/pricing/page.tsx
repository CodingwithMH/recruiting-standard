import type { Metadata } from "next";
import { ArrowUpRight, ArrowLeft } from "lucide-react";
import SiteLink from "@/components/ui/SiteLink";
import PricingSection from "@/components/pricing/PricingSection";

export const metadata: Metadata = {
  title: "School Pricing & Plans",
  description:
    "Institutional access for athletic departments and coaching staffs. Annual access for $1,500/year or monthly access for $250/month with manual billing administration.",
};

const comparisonFeatures = [
  { feature: "Approved Athlete Search Access", monthly: "Full Access", annual: "Full Access" },
  { feature: "Multi-Sport & Graduation Year Filters", monthly: "Included", annual: "Included" },
  { feature: "Saved Prospect Recruiting Boards", monthly: "Unlimited", annual: "Unlimited" },
  { feature: "Private Recruiting Activity & Contact Logs", monthly: "Included", annual: "Included" },
  { feature: "School Data Isolation (Rival Privacy)", monthly: "Guaranteed", annual: "Guaranteed" },
  { feature: "Document Verification File Access", monthly: "Signed Links", annual: "Signed Links" },
  { feature: "Permanent Unique School ID", monthly: "Issued on Approval", annual: "Issued on Approval" },
  { feature: "Authorized Coaching Staff Seats", monthly: "Unlimited", annual: "Unlimited" },
  { feature: "Dedicated Account & Onboarding Support", monthly: "Standard", annual: "Priority Assistance" },
  { feature: "Billing Method", monthly: "Manual Invoice / $250/mo", annual: "Manual Invoice / $1,500/yr" },
];

const pricingFaqs = [
  {
    q: "How are subscription payments administered?",
    a: "Payments are collected and recorded manually outside the platform via institutional purchase orders, checks, or ACH invoices. There is no automated credit card billing in this version, giving athletic directors full fiscal control.",
  },
  {
    q: "How many coaching staff accounts are included per school?",
    a: "Every approved school receives unlimited authorized coach and recruiter user accounts linked to their permanent School ID at no additional per-seat charge.",
  },
  {
    q: "What happens if our subscription expires or is suspended?",
    a: "In accordance with our access logic, school portal access is automatically restricted when a subscription expires or is suspended by a platform administrator until renewal payment is recorded.",
  },
  {
    q: "Can our school switch between monthly and annual plans?",
    a: "Yes. Athletic directors can transition from monthly to annual billing upon any renewal cycle by contacting platform administration.",
  },
];

export default function PricingPage() {
  return (
    <>
      {/* Page Hero */}
      <section className="py-16 sm:py-20 px-[6%] bg-[#f4f7fc] border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <SiteLink
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-[#102341] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to home</span>
            </SiteLink>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200 text-[#102341] text-xs font-semibold uppercase tracking-wider mb-4">
            <span>INVEST IN WHAT&apos;S NEXT</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold text-[#102341] tracking-tight leading-tight mb-4 max-w-3xl">
            Your program. Your pace.
          </h1>
          <p className="text-base sm:text-lg text-[#65748a] leading-relaxed max-w-2xl">
            Straightforward, transparent institutional pricing for athletic departments. Choose between
            annual program access or month-to-month flexibility.
          </p>
        </div>
      </section>

      {/* Pricing toggle + cards */}
      <section className="py-20 px-[6%] bg-white">
        <PricingSection />
      </section>

      {/* Institutional Plan Comparison Table */}
      <section className="py-20 px-[6%] bg-[#f4f7fc]/70 border-y border-slate-200/80">
        <div className="max-w-5xl mx-auto">
          <div className="max-w-2xl mb-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-[#102341] text-xs font-semibold uppercase tracking-wider mb-3">
              <span>Capability Matrix</span>
            </div>
            <h2 className="text-3xl font-semibold text-[#102341] tracking-tight mb-2">
              Everything your coaching staff needs to recruit.
            </h2>
            <p className="text-sm text-[#65748a]">
              All subscriptions include full portal access, unrestricted prospect boards, and verified
              student-athlete document access.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[#102341] font-bold">
                    <th className="py-4 px-6 font-semibold">Platform Capability</th>
                    <th className="py-4 px-6 font-semibold">Monthly Plan ($250/mo)</th>
                    <th className="py-4 px-6 font-semibold">Annual Plan ($1,500/yr)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {comparisonFeatures.map((row) => (
                    <tr key={row.feature} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-6 font-medium text-[#102341]">{row.feature}</td>
                      <td className="py-3.5 px-6 text-[#65748a]">
                        <span className="text-blue-600 font-bold mr-1.5">✓</span> {row.monthly}
                      </td>
                      <td className="py-3.5 px-6 text-[#102341] font-medium">
                        <span className="text-blue-600 font-bold mr-1.5">✓</span> {row.annual}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Manual Billing Guide Section */}
      <section className="py-20 px-[6%] bg-white">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-10 items-center">
          <div className="md:col-span-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-[#102341] text-xs font-semibold uppercase tracking-wider mb-3">
              <span>Procurement Invoicing</span>
            </div>
            <h2 className="text-3xl font-semibold text-[#102341] tracking-tight mb-4">
              Manual billing designed for institutional procurement.
            </h2>
            <p className="text-sm text-[#65748a] leading-relaxed mb-4">
              School districts and athletic departments require formal procurement processes. That is
              why MVP 4.18 operates with structured manual invoicing.
            </p>
            <p className="text-sm text-[#65748a] leading-relaxed">
              Upon registration approval, an official invoice is generated and tied directly to your
              institution&apos;s permanent School ID. Once payment is recorded, your subscription is
              activated immediately.
            </p>
          </div>

          <div className="md:col-span-6 bg-[#f4f7fc]/80 rounded-2xl p-7 border border-slate-200/90">
            <span className="text-[10px] font-bold text-[#65748a] uppercase tracking-wider block mb-4">
              Procurement Timeline
            </span>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0">
                  1
                </span>
                <div>
                  <h4 className="text-sm font-semibold text-[#102341]">Submit Registration</h4>
                  <p className="text-xs text-[#65748a]">Select Annual or Monthly plan on the school registration form.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0">
                  2
                </span>
                <div>
                  <h4 className="text-sm font-semibold text-[#102341]">Invoice Issued</h4>
                  <p className="text-xs text-[#65748a]">Platform administrators review your institution and issue a manual invoice.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0">
                  3
                </span>
                <div>
                  <h4 className="text-sm font-semibold text-[#102341]">Permanent School ID Issued</h4>
                  <p className="text-xs text-[#65748a]">Upon payment receipt, full platform credentials and School ID are unlocked.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing FAQs */}
      <section className="py-20 px-[6%] bg-[#f4f7fc]/70 border-t border-slate-200/80">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl font-semibold text-[#102341] tracking-tight">
              Frequently asked questions.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {pricingFaqs.map((faq) => (
              <div
                key={faq.q}
                className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs"
              >
                <h3 className="text-base font-semibold text-[#102341] mb-2">{faq.q}</h3>
                <p className="text-xs sm:text-sm text-[#65748a] leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-16 sm:py-20 px-[6%] bg-[#bed8ff] text-[#102341]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-8">
          <div>
            <span className="text-[10px] font-bold tracking-widest text-[#102341]/80 uppercase block mb-3 font-mono">
              READY TO EQUIP YOUR COACHES?
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight leading-tight m-0">
              Register your school today.
            </h2>
          </div>
          <SiteLink
            href="/school-registration"
            className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full bg-[#102341] text-white font-bold text-xs sm:text-sm hover:bg-[#1d3d68] transition-colors shadow-sm shrink-0"
          >
            <span>Begin Registration</span>
            <ArrowUpRight className="w-4 h-4 text-[#bed8ff]" />
          </SiteLink>
        </div>
      </section>
    </>
  );
}
