import type { Metadata } from "next";
import { Building2, GraduationCap, Users } from "lucide-react";
import SiteLink from "@/components/ui/SiteLink";
import LoginForm from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Portal Login",
  description:
    "One secure login for schools, student-athletes, and families. Sign in to access your personalized dashboard.",
};

const portalRoles = [
  {
    icon: Building2,
    role: "School Admins & Coaches",
    desc: "Manage recruiting, organize prospect shortlists, search approved athlete profiles, and access your school’s private recruiting records.",
  },
  {
    icon: GraduationCap,
    role: "Student-Athletes",
    desc: "Showcase your sports, stats, and highlights. Track your graduation timeline and manage documents for verification.",
  },
  {
    icon: Users,
    role: "Parents & Guardians",
    desc: "Support your linked student-athlete, upload required documents, and stay involved in recruiting communications.",
  },
];

export default function LoginPage() {
  return (
    <section className="py-8 sm:py-10 px-[6%] bg-[#f4f7fc] min-h-[calc(100vh-80px)]">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200 text-[#102341] text-xs font-semibold uppercase tracking-wider mb-3">
            <span>PORTAL ACCESS: Ready for your next chapter?</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-semibold text-[#102341] tracking-tight leading-tight mb-3">
            One secure login for schools, student-athletes, and families.
          </h1>
          <p className="text-sm sm:text-base text-[#65748a] leading-relaxed mb-5">
            Sign in to access your personalized dashboard.
          </p>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs max-w-md">
            <span className="text-[10px] font-bold text-[#65748a] uppercase tracking-wider block mb-3 font-mono">
              YOUR PORTAL. YOUR PATHWAY.
            </span>
            <div className="space-y-3.5">
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

            <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
              <p className="text-xs text-[#65748a] leading-relaxed">
                <strong className="text-[#102341]">Role-based access & school data isolation:</strong>{" "}
                School Admins manage school profile and authorized coaching staff. Coaches search
                approved prospects and manage private school recruiting notes. All school records
                are strictly isolated from rival programs.
              </p>
              <p className="text-xs text-[#65748a] leading-relaxed">
                Student-athlete privacy comes first. Read our{" "}
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
