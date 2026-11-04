"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFormik } from "formik";
import * as Yup from "yup";
import {
  ArrowUpRight,
  AlertCircle,
  Eye,
  EyeOff,
  Clock,
  ShieldAlert,
  ShieldCheck,
  LogOut,
} from "lucide-react";
import SiteLink from "@/components/ui/SiteLink";
import { apiRequest, AuthResponse } from "@/lib/api";
import { saveSession, endSession } from "@/lib/auth";

const loginSchema = Yup.object({
  email: Yup.string()
    .trim()
    .email("Please enter a valid email address")
    .required("Email address is required"),
  password: Yup.string().required("Password is required"),
});

export default function LoginForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [pendingSchoolNotice, setPendingSchoolNotice] = useState<{
    schoolName: string;
    contactEmail: string;
    status: "PENDING" | "SUSPENDED" | "REJECTED";
  } | null>(null);
  const [pendingAthleteNotice, setPendingAthleteNotice] = useState<{
    email: string;
    message: string;
  } | null>(null);

  const formik = useFormik({
    initialValues: {
      email: "",
      password: "",
    },
    validationSchema: loginSchema,
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      setServerError(null);
      setPendingSchoolNotice(null);
      setPendingAthleteNotice(null);

      const response = await apiRequest<AuthResponse>("auth/login", {
        method: "POST",
        body: JSON.stringify(values),
      });

      setSubmitting(false);

      if (!response.success || !response.data) {
        if (
          response.error &&
          (response.error.toLowerCase().includes("pending verification") ||
            response.error.toLowerCase().includes("student-athlete account"))
        ) {
          setPendingAthleteNotice({
            email: values.email,
            message: response.error,
          });
          return;
        }

        setServerError(
          response.error || "Invalid email or password. Please verify your credentials."
        );
        return;
      }

      const { user, token } = response.data;

      // Pending, suspended, and rejected schools must not receive a usable
      // portal session. Show the status instead of persisting the token.
      const blockedMembership = user.memberships?.find(
        (m) => m.school.status !== "APPROVED"
      );

      if (
        user.globalRole === "SCHOOL_STAFF" &&
        blockedMembership &&
        blockedMembership.school.status !== "APPROVED"
      ) {
        setPendingSchoolNotice({
          schoolName: blockedMembership.school.name,
          contactEmail: user.email,
          status: blockedMembership.school.status,
        });
        return;
      }

      if (!token) {
        setServerError("Authentication failed. No active session token received.");
        return;
      }

      saveSession(token, user);
      resetForm();

      // Replace the login page in history so browser Back cannot restore the
      // submitted credentials.
      if (user.globalRole === "PLATFORM_ADMIN") {
        router.replace("/admin/dashboard");
      } else if (user.globalRole === "SCHOOL_STAFF") {
        router.replace("/portal/dashboard");
      } else if (user.globalRole === "ATHLETE") {
        router.replace("/portal/athlete");
      } else if (user.globalRole === "PARENT") {
        router.replace("/portal/parent");
      } else {
        router.replace("/portal/dashboard");
      }
    },
  });

  const handleDismissPending = () => {
    endSession();
    formik.resetForm();
    setPendingSchoolNotice(null);
  };

  if (pendingSchoolNotice) {
    return (
      <div className="bg-white p-7 sm:p-9 border border-amber-200 rounded-2xl shadow-sm w-full space-y-5">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-amber-800 text-xs font-semibold uppercase tracking-wider">
          <Clock className="w-3.5 h-3.5" />
          <span>
            {pendingSchoolNotice.status === "PENDING"
              ? "Institutional Verification Pending"
              : `Institutional Access ${pendingSchoolNotice.status.toLowerCase()}`}
          </span>
        </div>

        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#102341]">
            {pendingSchoolNotice.status === "PENDING"
              ? "Registration Pending Review"
              : "Portal Access Unavailable"}
          </h2>
          <p className="text-xs text-[#65748a] mt-1.5 leading-relaxed">
            Your school account for <strong className="text-[#102341]">{pendingSchoolNotice.schoolName}</strong> is
            {pendingSchoolNotice.status === "PENDING"
              ? " currently awaiting Platform Administrator verification."
              : pendingSchoolNotice.status === "SUSPENDED"
                ? " currently suspended. Please contact institutional support."
                : " not approved. Please contact institutional support."}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/60 text-amber-900 text-xs leading-relaxed space-y-2">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block mb-0.5">Recruiting Portal Access Restricted</span>
              To protect student-athlete privacy, recruiting records and athlete contact tools are
              accessible only while your institution is approved and has an active permanent
              School ID (SCH-XXXXX).
            </div>
          </div>
          <div className="text-[11px] text-amber-800/80 border-t border-amber-200/50 pt-2">
            Account contact: <span className="font-semibold">{pendingSchoolNotice.contactEmail}</span>
          </div>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={handleDismissPending}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#102341] text-white hover:bg-[#1d3d68] transition-colors text-xs font-semibold shadow-xs cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
          <SiteLink
            href="/"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-full border border-slate-200 text-[#102341] hover:bg-slate-50 transition-colors text-xs font-semibold text-center"
          >
            Back to Home
          </SiteLink>
        </div>
      </div>
    );
  }

  if (pendingAthleteNotice) {
    return (
      <div className="bg-white p-7 sm:p-9 border border-amber-200 rounded-2xl shadow-sm w-full space-y-5">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-amber-800 text-xs font-semibold uppercase tracking-wider">
          <Clock className="w-3.5 h-3.5" />
          <span>Student-Athlete Verification Pending</span>
        </div>

        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#102341]">
            Registration Pending Approval
          </h2>
          <p className="text-xs text-[#65748a] mt-1.5 leading-relaxed">
            {pendingAthleteNotice.message}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/60 text-amber-900 text-xs leading-relaxed space-y-2">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block mb-0.5">Recruiting Portal Access Restricted</span>
              To protect student-athlete privacy and ensure recruitment integrity, only verified
              students enrolled at an approved participating school can access recruiting profiles.
            </div>
          </div>
          <div className="text-[11px] text-amber-800/80 border-t border-amber-200/50 pt-2">
            Account email: <span className="font-semibold">{pendingAthleteNotice.email}</span>
          </div>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => {
              formik.resetForm();
              setPendingAthleteNotice(null);
            }}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#102341] text-white hover:bg-[#1d3d68] transition-colors text-xs font-semibold shadow-xs cursor-pointer"
          >
            <span>Back to Login</span>
          </button>
          <SiteLink
            href="/"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-full border border-slate-200 text-[#102341] hover:bg-slate-50 transition-colors text-xs font-semibold text-center"
          >
            Back to Home
          </SiteLink>
        </div>
      </div>
    );
  }

  const isInvalid = (field: keyof typeof formik.values) =>
    formik.touched[field] && Boolean(formik.errors[field]);

  return (
    <form
      className="w-full overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-[0_24px_60px_-28px_rgba(16,35,65,0.45)]"
      onSubmit={formik.handleSubmit}
      noValidate
    >
      <div className="relative overflow-hidden bg-[#102341] px-6 py-6 sm:px-7">
        <div className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-blue-400/20 blur-2xl" />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#bed8ff]">
            <ShieldCheck className="h-3.5 w-3.5" />
            Secure portal access
          </span>
          <h2 className="mt-3 text-xl font-bold tracking-tight text-white sm:text-2xl">
            Sign in to your dashboard.
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-300">
            Use your account email and password. We&apos;ll take you to the right dashboard for
            your role.
          </p>
        </div>
      </div>

      <div className="space-y-4 p-6 sm:p-7">
      {serverError && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
          <div>
            <span className="font-semibold block mb-0.5">Authentication Failed</span>
            <span>{serverError}</span>
          </div>
        </div>
      )}

      {/* Email Input */}
      <div className="space-y-1.5">
        <label htmlFor="login-email" className="block text-xs font-semibold text-[#102341]">
          Email address
        </label>
        <input
          id="login-email"
          type="email"
          name="email"
          autoComplete="email"
          value={formik.values.email}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          placeholder="coach@school.org"
          className={`w-full rounded-xl border bg-white px-4 py-3 text-sm text-[#102341] shadow-xs transition-colors outline-none ${
            isInvalid("email")
              ? "border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500"
              : "border-slate-200 focus:border-[#102341] focus:ring-1 focus:ring-[#102341]"
          }`}
        />
        {isInvalid("email") && (
          <p className="text-[11px] text-red-600 font-medium">{formik.errors.email}</p>
        )}
      </div>

      {/* Password Input with Eye Toggle */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="login-password" className="block text-xs font-semibold text-[#102341]">
            Password
          </label>
          <SiteLink
            href="/forgot-password"
            className="text-[11px] font-semibold text-[#102341] hover:underline"
          >
            Forgot password?
          </SiteLink>
        </div>
        <div className="relative">
          <input
            id="login-password"
            type={showPassword ? "text" : "password"}
            name="password"
            autoComplete="current-password"
            value={formik.values.password}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            placeholder="••••••••••••"
            className={`w-full rounded-xl border bg-white px-4 py-3 pr-11 text-sm text-[#102341] shadow-xs transition-colors outline-none ${
              isInvalid("password")
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
        {isInvalid("password") && (
          <p className="text-[11px] text-red-600 font-medium">{formik.errors.password}</p>
        )}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={formik.isSubmitting}
        className="mt-1 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#102341] px-6 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:bg-[#1d3d68] hover:shadow-lg disabled:opacity-60"
      >
        {formik.isSubmitting ? (
          <span>Signing in...</span>
        ) : (
          <>
            <span>Log in to portal</span>
            <ArrowUpRight className="w-4 h-4 text-[#bed8ff]" />
          </>
        )}
      </button>

      <div className="space-y-3 border-t border-slate-100 pt-4">
        <div className="grid gap-2">
          <SiteLink
            href="/signup"
            className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-[#102341] transition-colors hover:border-slate-300 hover:bg-slate-50"
          >
            <span>New athlete or parent? Create an account</span>
            <ArrowUpRight className="h-3.5 w-3.5 text-slate-500" />
          </SiteLink>
          <SiteLink
            href="/school-registration"
            className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-[#102341] transition-colors hover:border-slate-300 hover:bg-slate-50"
          >
            <span>New school? Register your institution</span>
            <ArrowUpRight className="h-3.5 w-3.5 text-slate-500" />
          </SiteLink>
        </div>
        <p className="text-center text-[11px] leading-relaxed text-[#65748a]">
          Review our{" "}
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
    </form>
  );
}
