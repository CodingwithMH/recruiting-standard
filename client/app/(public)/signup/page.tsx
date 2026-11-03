import type { Metadata } from "next";
import { GraduationCap, ShieldCheck, Users } from "lucide-react";
import SiteLink from "@/components/ui/SiteLink";
import SignupForm from "@/components/auth/SignupForm";

export const metadata: Metadata = {
  title: "Create an Athlete or Parent Account",
  description:
    "Create a student-athlete or parent/guardian account for The Recruiting Standard portal.",
};

const accountBenefits = [
  {
    icon: GraduationCap,
    title: "Student-Athletes",
    description:
      "Create a free account, publish highlight videos, and connect with a guardian.",
  },
  {
    icon: Users,
    title: "Parents & Guardians",
    description:
      "Request a secure link to your athlete's account and oversee their activity.",
  },
  {
    icon: ShieldCheck,
    title: "Consent-Based Linking",
    description:
      "Parent access starts only after the linked athlete approves the request.",
  },
];

export default function SignupPage() {
  return (
    <section className="py-8 sm:py-10 px-[6%] bg-[#f4f7fc] min-h-[calc(100vh-80px)]">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200 text-[#102341] text-xs font-semibold uppercase tracking-wider mb-3">
            <span>ATHLETE & FAMILY ACCESS</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-semibold text-[#102341] tracking-tight leading-tight mb-3">
            Start your recruiting journey.
          </h1>
          <p className="text-sm sm:text-base text-[#65748a] leading-relaxed mb-5">
            Athletes and parents/guardians can create free portal accounts here. You do not need a
            paid individual student plan, and you do not need to wait for a school to be approved
            before signing up. School staff accounts are created through institutional registration.
          </p>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs max-w-md space-y-4">
            {accountBenefits.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <div key={benefit.title} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#102341]">{benefit.title}</h4>
                    <p className="text-xs text-[#65748a] leading-relaxed mt-0.5">
                      {benefit.description}
                    </p>
                  </div>
                </div>
              );
            })}

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
              <p className="text-[11px] text-[#65748a] leading-relaxed">
                <strong className="text-[#102341]">Do athletes need an approved school?</strong>{" "}
                No. Create an account now. School staff can sign in only after their school is
                approved, and profiles are shared with schools only after completion and approval.
                No $500/year individual student plan is offered.
              </p>
            </div>

            <div className="pt-2.5 border-t border-slate-100 space-y-1.5">
              <SiteLink
                href="/school-registration"
                className="block text-xs font-semibold text-[#102341] hover:underline"
              >
                Registering a school instead? Start here ↗
              </SiteLink>
              <p className="text-[11px] text-[#65748a] leading-relaxed">
                Review our{" "}
                <SiteLink href="/privacy-policy" className="font-semibold text-[#102341] hover:underline">
                  Privacy Policy
                </SiteLink>{" "}
                and{" "}
                <SiteLink href="/terms" className="font-semibold text-[#102341] hover:underline">
                  Terms of Use
                </SiteLink>
                .
              </p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-6">
          <SignupForm />
        </div>
      </div>
    </section>
  );
}
