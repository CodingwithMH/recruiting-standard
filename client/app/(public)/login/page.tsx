import type { Metadata } from "next";
import { Building2, GraduationCap, Users } from "lucide-react";
import SiteLink from "@/components/ui/SiteLink";
import LoginForm from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Portal Login",
  description:
    "Sign in to The Recruiting Standard portal for school staff, student-athletes, and families.",
};

const portalRoles = [
  {
    icon: Building2,
    role: "School Admins & Coaches",
    desc: "School admins can update the school profile and manage staff accounts. Coaches share the same login with view-only school access.",
  },
  {
    icon: GraduationCap,
    role: "Student-Athletes",
    desc: "Create a free account, publish highlight videos, and approve guardian access.",
  },
  {
    icon: Users,
    role: "Parents & Guardians",
    desc: "Request a consent-based link to your athlete's account. Access begins after the athlete approves.",
  },
];

export default function LoginPage() {
  return (
    <section className="py-8 sm:py-10 px-[6%] bg-[#f4f7fc] min-h-[calc(100vh-80px)]">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200 text-[#102341] text-xs font-semibold uppercase tracking-wider mb-3">
            <span>PORTAL ACCESS</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold text-[#102341] tracking-tight leading-tight mb-3">
            Welcome back.
          </h1>
          <p className="text-sm sm:text-base text-[#65748a] leading-relaxed mb-5">
            One secure login for schools, student-athletes, and families. Sign in to access your
            dashboard.
          </p>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs max-w-md">
            <span className="text-[10px] font-bold text-[#65748a] uppercase tracking-wider block mb-3 font-mono">
              YOUR PORTAL. YOUR PATHWAY.
            </span>
            <div className="space-y-3">
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
            <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5">
              <p className="text-xs text-[#65748a] leading-relaxed">
                <strong className="text-[#102341]">Same school login, different permissions.</strong>{" "}
                Admins manage school settings and staff accounts, while coaches get view-only
                access to the school profile.
              </p>
              <p className="text-xs text-[#65748a] leading-relaxed">
                Student privacy comes first. Read our{" "}
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
          <LoginForm />
        </div>
      </div>
    </section>
  );
}
