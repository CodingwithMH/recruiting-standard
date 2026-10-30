"use client";

import { useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import {
  ArrowUpRight,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
} from "lucide-react";
import SiteLink from "@/components/ui/SiteLink";
import { apiRequest } from "@/lib/api";

const resetPasswordSchema = Yup.object({
  password: Yup.string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must not exceed 128 characters")
    .required("Password is required"),
});

export default function ResetPasswordForm({ token }: { token: string }) {
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const formik = useFormik({
    initialValues: { password: "" },
    validationSchema: resetPasswordSchema,
    onSubmit: async (values, { setSubmitting }) => {
      setServerError(null);

      const response = await apiRequest("auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password: values.password }),
      });

      setSubmitting(false);

      if (!response.success) {
        setServerError(
          response.error || "Unable to reset your password. Please try again."
        );
        return;
      }

      setSuccessMessage(
        response.message || "Your password has been reset successfully."
      );
    },
  });

  const isInvalid =
    formik.touched.password && Boolean(formik.errors.password);

  if (!token) {
    return (
      <div className="bg-white p-7 sm:p-9 border border-slate-200/90 rounded-2xl shadow-sm self-start w-full space-y-5">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 border border-red-200/80 text-red-800 text-xs font-semibold uppercase tracking-wider">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Invalid link</span>
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#102341]">
            Reset link is missing
          </h2>
          <p className="text-xs text-[#65748a] mt-1.5 leading-relaxed">
            This password reset link is invalid. Request a new link to continue.
          </p>
        </div>
        <SiteLink
          href="/forgot-password"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#102341] text-white hover:bg-[#1d3d68] transition-colors text-xs font-semibold shadow-xs"
        >
          <span>Request a new link</span>
        </SiteLink>
      </div>
    );
  }

  if (successMessage) {
    return (
      <div className="bg-white p-7 sm:p-9 border border-slate-200/90 rounded-2xl shadow-sm self-start w-full space-y-5">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-semibold uppercase tracking-wider">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Password updated</span>
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#102341]">
            You are all set
          </h2>
          <p className="text-xs text-[#65748a] mt-1.5 leading-relaxed">
            {successMessage} Sign in with your new password.
          </p>
        </div>
        <SiteLink
          href="/login"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#102341] text-white hover:bg-[#1d3d68] transition-colors text-xs font-semibold shadow-xs"
        >
          <span>Back to login</span>
        </SiteLink>
      </div>
    );
  }

  return (
    <form
      className="bg-white p-7 sm:p-9 border border-slate-200/90 rounded-2xl shadow-sm self-start w-full space-y-4"
      onSubmit={formik.handleSubmit}
      noValidate
    >
      <div className="border-b border-slate-100 pb-4 mb-2">
        <span className="text-[10px] font-bold tracking-widest text-[#65748a] uppercase block mb-1 font-mono">
          ACCOUNT RECOVERY
        </span>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#102341] m-0">
          Set a new password
        </h2>
        <p className="text-xs text-[#65748a] mt-1.5 leading-relaxed">
          Choose a new password for your account. This link can only be used
          once.
        </p>
      </div>

      {serverError && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
          <div>
            <span className="font-semibold block mb-0.5">Reset failed</span>
            <span>{serverError}</span>
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <label
          htmlFor="reset-password"
          className="block text-xs font-semibold text-[#102341]"
        >
          New password
        </label>
        <div className="relative">
          <input
            id="reset-password"
            type={showPassword ? "text" : "password"}
            name="password"
            autoComplete="new-password"
            value={formik.values.password}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            placeholder="••••••••••••"
            className={`w-full rounded-xl border bg-[#f8fafc] px-3.5 py-2.5 pr-11 text-xs sm:text-sm text-[#102341] focus:bg-white transition-colors outline-none ${
              isInvalid
                ? "border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                : "border-slate-200 focus:border-[#102341] focus:ring-1 focus:ring-[#102341]"
            }`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-1 cursor-pointer transition-colors"
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4 text-slate-500" />
            ) : (
              <Eye className="w-4 h-4 text-slate-500" />
            )}
          </button>
        </div>
        {isInvalid && (
          <p className="text-[11px] text-red-600 font-medium">
            {formik.errors.password}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={formik.isSubmitting}
        className="w-full py-3.5 px-6 rounded-full bg-[#102341] text-white font-bold text-xs sm:text-sm hover:bg-[#1d3d68] disabled:opacity-60 transition-colors shadow-sm inline-flex items-center justify-center gap-2 cursor-pointer mt-2"
      >
        {formik.isSubmitting ? (
          <span>Updating password...</span>
        ) : (
          <>
            <span>Reset password</span>
            <ArrowUpRight className="w-4 h-4 text-[#bed8ff]" />
          </>
        )}
      </button>

      <div className="text-center pt-2 border-t border-slate-100">
        <SiteLink
          href="/login"
          className="text-xs font-semibold text-[#102341] hover:underline"
        >
          Back to login
        </SiteLink>
      </div>
    </form>
  );
}
