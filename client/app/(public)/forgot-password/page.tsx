import type { Metadata } from "next";
import { ArrowLeft, KeyRound } from "lucide-react";
import SiteLink from "@/components/ui/SiteLink";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Forgot Password",
  description: "Request a password reset link for your MVP 4.18 account.",
};

export default function ForgotPasswordPage() {
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
            Get back into your portal.
          </h1>
          <p className="text-base text-[#65748a] leading-relaxed mb-8">
            Enter the email address associated with your account. If it matches
            an active account, we will send a secure, single-use link to reset
            your password.
          </p>

          <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs max-w-md">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#102341]">
                  Reset links expire in 1 hour
                </h4>
                <p className="text-xs text-[#65748a] leading-relaxed mt-0.5">
                  Each link can only be used once. Resetting your password also
                  signs out all existing sessions.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-6">
          <ForgotPasswordForm />
        </div>
      </div>
    </section>
  );
}
