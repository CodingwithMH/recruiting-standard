import { GraduationCap, Award, Building2, Users, Check, ArrowUpRight } from "lucide-react";
import SiteLink from "@/components/ui/SiteLink";

const roles = [
  {
    role: "Student-Athletes",
    badge: "ATHLETE",
    icon: GraduationCap,
    desc: "Build your free athlete account now. Verified profiles and document review are planned for Milestone 3.",
    features: [
      "Free athlete account",
      "Highlight video uploads",
      "Guardian access you approve",
    ],
    ctaHref: "/signup",
  },
  {
    role: "Coaches & Recruiters",
    badge: "COACH",
    icon: Award,
    desc: "A recruiting workspace for approved talent search and shortlists, rolling out in Milestone 4.",
    features: [
      "Athlete search (Milestone 4)",
      "Prospect shortlists (Milestone 4)",
      "Evaluation notes (Milestone 4)",
    ],
    ctaHref: "/school-registration",
  },
  {
    role: "School Administrators",
    badge: "INSTITUTION",
    icon: Building2,
    desc: "Manage your institution, staff accounts, and permanent School ID from one place.",
    features: [
      "Permanent unique School ID",
      "Staff account management",
      "Annual or monthly manual billing",
    ],
    ctaHref: "/school-registration",
  },
  {
    role: "Parents & Guardians",
    badge: "FAMILY",
    icon: Users,
    desc: "Support your athlete with consent-based access to their recruiting account.",
    features: [
      "Athlete-approved linking",
      "Privacy-first access controls",
      "Account oversight without shared passwords",
    ],
    ctaHref: "/signup",
  },
];

export default function RoleEcosystem() {
  return (
    <section className="py-20 px-[6%] bg-white">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-[#102341] text-xs font-semibold uppercase tracking-wider mb-3">
            <span>Role Ecosystem</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-semibold text-[#102341] tracking-tight mb-3">
            Built for everyone in recruiting.
          </h2>
          <p className="text-sm sm:text-base text-[#65748a] leading-relaxed">
            Role-gated portal environments tailored specifically to athletes, coaches, athletic
            directors, and families.
          </p>
        </div>

        {/* 4 Minimalist Role Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {roles.map((item) => {
            const IconComponent = item.icon;
            return (
              <div
                key={item.role}
                className="bg-[#f4f7fc]/60 hover:bg-white rounded-2xl p-6 border border-slate-200/80 hover:border-blue-300 hover:shadow-md transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-[#102341]">
                      <IconComponent className="w-5 h-5 text-slate-700" />
                    </div>
                    <span className="text-[10px] font-bold text-[#65748a] uppercase tracking-wider bg-white px-2 py-0.5 rounded-md border border-slate-200">
                      {item.badge}
                    </span>
                  </div>

                  <h3 className="text-lg font-semibold text-[#102341] mb-2">{item.role}</h3>
                  <p className="text-xs sm:text-sm text-[#65748a] leading-relaxed mb-6">
                    {item.desc}
                  </p>

                  <ul className="space-y-2.5 pt-4 border-t border-slate-200/80">
                    {item.features.map((feat) => (
                      <li key={feat} className="flex items-center gap-2 text-xs text-[#102341]">
                        <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-6 mt-6 border-t border-slate-200/60">
                  <SiteLink
                    href={item.ctaHref}
                    className="inline-flex items-center justify-between w-full text-xs font-semibold text-[#102341] hover:text-blue-700 transition-colors"
                  >
                    <span>View Role Capabilities</span>
                    <ArrowUpRight className="w-4 h-4 text-[#65748a]" />
                  </SiteLink>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
