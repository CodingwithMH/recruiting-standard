import type { Metadata } from "next";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import SiteLink from "@/components/ui/SiteLink";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Set a new password for your MVP 4.18 account.",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <section className="py-16 sm:py-20 px-[6%] bg-[#f4f7fc] min-h-[calc(100vh-80px)]">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        <div className="lg:col-span-6">
          <div className="mb-6">
            <SiteLink
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-[#102341] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to login</span>
            </SiteLink>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200 text-[#102341] text-xs font-semibold uppercase tracking-wider mb-4">
            <span>ACCOUNT RECOVERY</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-semibold text-[#102341] tracking-tight leading-tight mb-4">
            Choose a new password.
          </h1>
          <p className="text-base text-[#65748a] leading-relaxed mb-8">
            Your reset link is single-use and expires shortly after it is sent.
            Once your password is changed, every existing session is signed out.
          </p>

          <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs max-w-md">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#102341]">
                  Keep your account secure
                </h4>
                <p className="text-xs text-[#65748a] leading-relaxed mt-0.5">
                  Use at least 8 characters. Never share your password or reset
                  link with anyone.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-6">
          <ResetPasswordForm token={token ?? ""} />
        </div>
      </div>
    </section>
  );
}
