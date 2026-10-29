import type { Metadata } from "next";
import { FileSpreadsheet, ShieldAlert, Award, CheckCircle2, ArrowLeft } from "lucide-react";
import SiteLink from "@/components/ui/SiteLink";
import RegistrationForm from "@/components/school-registration/RegistrationForm";

export const metadata: Metadata = {
  title: "Register Your School Program",
  description:
    "Request verified institutional access for your school athletic program. Learn about the Pending to Approved review process and permanent School ID issuance.",
};

const registrationSteps = [
  {
    num: "01",
    icon: FileSpreadsheet,
    title: "Submit Institutional Registration",
    desc: "Complete the form with your school name, athletic department contact, and preferred subscription tier (Annual $1,500 or Monthly $250).",
  },
  {
    num: "02",
    icon: ShieldAlert,
    title: "Administrative Verification (Pending)",
    desc: "Platform administrators review your institution's credentials. Status remains Pending to safeguard platform data integrity.",
  },
  {
    num: "03",
    icon: Award,
    title: "Permanent School ID Issued",
    desc: "Upon approval and payment confirmation, your permanent unique School ID is issued, unlocking the portal dashboard.",
  },
];

const institutionalChecklist = [
  "Accredited high school, prep academy, or college athletic program",
  "Authorized Athletic Director, Head Coach, or Administrator contact",
  "Official institutional email domain for identity verification",
  "Agreement to platform athlete data protection & privacy standards",
];

export default function SchoolRegistrationPage() {
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
            <span>FOR SCHOOLS &amp; COACHING STAFFS</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold text-[#102341] tracking-tight leading-tight mb-4 max-w-3xl">
            Your next great team starts here.
          </h1>
          <p className="text-base sm:text-lg text-[#65748a] leading-relaxed max-w-2xl">
            Introduce your athletic program and unlock verified recruit discovery. Every school
            undergoes administrative review to ensure a safe, legitimate athletic network.
          </p>
        </div>
      </section>

      {/* 3-Step Verification Pipeline */}
      <section className="py-16 px-[6%] bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mb-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-[#102341] text-xs font-semibold uppercase tracking-wider mb-3">
              <span>Onboarding Pipeline</span>
            </div>
            <h2 className="text-3xl font-semibold text-[#102341] tracking-tight">
              How institutional approval works.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {registrationSteps.map(({ num, icon: IconComponent, title, desc }) => (
              <div
                key={num}
                className="bg-[#f4f7fc]/60 rounded-2xl p-6 border border-slate-200/80 hover:border-blue-300 hover:bg-white hover:shadow-md transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-2xs">
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-mono font-bold text-[#65748a]">{num}</span>
                  </div>
                  <h3 className="text-base font-semibold text-[#102341] mb-2">{title}</h3>
                  <p className="text-xs sm:text-sm text-[#65748a] leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Registration Form Split Layout */}
      <section className="py-20 px-[6%] bg-[#f4f7fc]/70 border-t border-slate-200/80">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-5">
            <span className="text-[10px] font-bold tracking-widest text-[#65748a] uppercase block mb-2 font-mono">
              REQUEST INSTITUTIONAL ACCESS
            </span>
            <h2 className="text-3xl sm:text-4xl font-semibold text-[#102341] tracking-tight mb-4">
              Join the network of verified programs.
            </h2>
            <p className="text-sm text-[#65748a] leading-relaxed mb-8">
              Submit the official form to initiate your institution&apos;s review. In accordance with
              platform security rules, Pending schools cannot access athlete search until administrative
              approval is granted.
            </p>

            <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs">
              <span className="text-[10px] font-bold text-[#65748a] uppercase tracking-wider block mb-3">
                Institutional Criteria
              </span>
              <ul className="space-y-2.5">
                {institutionalChecklist.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-xs text-[#102341]">
                    <CheckCircle2 className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="lg:col-span-7">
            <RegistrationForm />
          </div>
        </div>
      </section>
    </>
  );
}
