"use client";

import { useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { ArrowUpRight, AlertCircle, CheckCircle2 } from "lucide-react";
import SiteLink from "@/components/ui/SiteLink";
import { apiRequest } from "@/lib/api";

const forgotPasswordSchema = Yup.object({
  email: Yup.string()
    .trim()
    .email("Please enter a valid email address")
    .required("Email address is required"),
});

export default function ForgotPasswordForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [sentMessage, setSentMessage] = useState<string | null>(null);

  const formik = useFormik({
    initialValues: { email: "" },
    validationSchema: forgotPasswordSchema,
    onSubmit: async (values, { setSubmitting }) => {
      setServerError(null);

      const response = await apiRequest("auth/forgot-password", {
        method: "POST",
        body: JSON.stringify(values),
      });

      setSubmitting(false);

      if (!response.success) {
        setServerError(
          response.error || "Unable to process your request. Please try again."
        );
        return;
      }

      setSentMessage(
        response.message ||
          "If an account with that email address exists, a password reset link has been sent."
      );
    },
  });

  const isInvalid =
    formik.touched.email && Boolean(formik.errors.email);

  if (sentMessage) {
    return (
      <div className="bg-white p-7 sm:p-9 border border-slate-200/90 rounded-2xl shadow-sm self-start w-full space-y-5">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-semibold uppercase tracking-wider">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Check your email</span>
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#102341]">
            Reset link requested
          </h2>
          <p className="text-xs text-[#65748a] mt-1.5 leading-relaxed">
            {sentMessage}
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
          Forgot your password?
        </h2>
        <p className="text-xs text-[#65748a] mt-1.5 leading-relaxed">
          Enter your account email and we will send you a link to reset your
          password.
        </p>
      </div>

      {serverError && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
          <div>
            <span className="font-semibold block mb-0.5">Request failed</span>
            <span>{serverError}</span>
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <label
          htmlFor="forgot-email"
          className="block text-xs font-semibold text-[#102341]"
        >
          Email address
        </label>
        <input
          id="forgot-email"
          type="email"
          name="email"
          autoComplete="email"
          value={formik.values.email}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          placeholder="coach@school.org"
          className={`w-full rounded-xl border bg-[#f8fafc] px-3.5 py-2.5 text-xs sm:text-sm text-[#102341] focus:bg-white transition-colors outline-none ${
            isInvalid
              ? "border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500"
              : "border-slate-200 focus:border-[#102341] focus:ring-1 focus:ring-[#102341]"
          }`}
        />
        {isInvalid && (
          <p className="text-[11px] text-red-600 font-medium">
            {formik.errors.email}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={formik.isSubmitting}
        className="w-full py-3.5 px-6 rounded-full bg-[#102341] text-white font-bold text-xs sm:text-sm hover:bg-[#1d3d68] disabled:opacity-60 transition-colors shadow-sm inline-flex items-center justify-center gap-2 cursor-pointer mt-2"
      >
        {formik.isSubmitting ? (
          <span>Sending...</span>
        ) : (
          <>
            <span>Send reset link</span>
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
