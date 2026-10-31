import type { Metadata } from "next";
import { ArrowLeft, GraduationCap, ShieldCheck, Users } from "lucide-react";
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
      "Create your account now to prepare your verified athletic profile and document uploads.",
  },
  {
    icon: Users,
    title: "Parents & Guardians",
    description:
      "Request a secure link to your athlete's account and oversee their recruiting activity.",
  },
  {
    icon: ShieldCheck,
    title: "Consent-Based Linking",
    description:
      "Parent access is only granted after the linked athlete approves the request.",
  },
];

export default function SignupPage() {
  return (
    <section className="py-16 sm:py-20 px-[6%] bg-[#f4f7fc] min-h-[calc(100vh-80px)]">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        <div className="lg:col-span-6">
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
            <span>ATHLETE & FAMILY ACCESS</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-semibold text-[#102341] tracking-tight leading-tight mb-4">
            Start your recruiting journey.
          </h1>
          <p className="text-base text-[#65748a] leading-relaxed mb-8">
            Athletes and parents/guardians can create portal accounts here. School staff
            accounts are created through the institutional registration process.
          </p>

          <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs max-w-md space-y-5">
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

            <div className="pt-3 border-t border-slate-100">
              <SiteLink
                href="/school-registration"
                className="text-xs font-semibold text-[#102341] hover:underline"
              >
                Registering a school instead? Start here ↗
              </SiteLink>
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
