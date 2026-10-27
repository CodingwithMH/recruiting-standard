import type { Metadata } from "next";
import { KeyRound, Building2, GraduationCap, Users, ArrowLeft } from "lucide-react";
import SiteLink from "@/components/ui/SiteLink";
import InquiryForm from "@/components/shared/InquiryForm";

export const metadata: Metadata = {
  title: "Portal Login",
  description:
    "Log in to the MVP 4.18 portal for Platform Admins, School Admins, Coaches, Athletes, and Parents.",
};

const portalRoles = [
  {
    icon: Building2,
    role: "School Admins & Coaches",
    desc: "Recruiting dashboard, prospect shortlists, approved athlete search, and private recruiting records.",
  },
  {
    icon: GraduationCap,
    role: "Student-Athletes",
    desc: "Multi-sport stats, graduation timeline, highlight reels, and document verification queue.",
  },
  {
    icon: Users,
    role: "Parents & Guardians",
    desc: "Oversee linked athlete workflows, document uploads, and recruiting communications securely.",
  },
];

export default function LoginPage() {
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
            <span>PORTAL ACCESS</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-semibold text-[#102341] tracking-tight leading-tight mb-4">
            Ready for your next chapter?
          </h1>
          <p className="text-base text-[#65748a] leading-relaxed mb-8">
            One unified login for all platform members. Authenticated sessions automatically direct
            you to your role-specific dashboard.
          </p>

          <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs max-w-md">
            <span className="text-[10px] font-bold text-[#65748a] uppercase tracking-wider block mb-4 font-mono">
              ROLE-BASED AUTHORIZATION
            </span>
            <div className="space-y-4">
              {portalRoles.map((pr) => {
                const IconComponent = pr.icon;
                return (
                  <div key={pr.role} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#102341]">{pr.role}</h4>
                      <p className="text-xs text-[#65748a] leading-relaxed mt-0.5">{pr.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="lg:col-span-6">
          <InquiryForm type="login" />
        </div>
      </div>
    </section>
  );
}
