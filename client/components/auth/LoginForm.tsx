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
  } | null>(null);

  const formik = useFormik({
    initialValues: {
      email: "",
      password: "",
    },
    validationSchema: loginSchema,
    onSubmit: async (values, { setSubmitting }) => {
      setServerError(null);
      setPendingSchoolNotice(null);

      const response = await apiRequest<AuthResponse>("auth/login", {
        method: "POST",
        body: JSON.stringify(values),
      });

      setSubmitting(false);

      if (!response.success || !response.data) {
        setServerError(
          response.error || "Invalid email or password. Please verify your credentials."
        );
        return;
      }

      const { user, token } = response.data;
      saveSession(token, user);

      // Check for pending school status
      const pendingMembership = user.memberships?.find(
        (m) => m.school.status === "PENDING"
      );

      if (pendingMembership) {
        setPendingSchoolNotice({
          schoolName: pendingMembership.school.name,
          contactEmail: user.email,
        });
        return;
      }

      // Role-based routing
      if (user.globalRole === "PLATFORM_ADMIN") {
        router.push("/admin/dashboard");
      } else if (user.globalRole === "SCHOOL_STAFF") {
        router.push("/portal/dashboard");
      } else if (user.globalRole === "ATHLETE") {
        router.push("/portal/athlete");
      } else if (user.globalRole === "PARENT") {
        router.push("/portal/parent");
      } else {
        router.push("/portal/dashboard");
      }
    },
  });

  const handleDismissPending = () => {
    endSession();
    setPendingSchoolNotice(null);
  };

  if (pendingSchoolNotice) {
    return (
      <div className="bg-white p-7 sm:p-9 border border-amber-200 rounded-2xl shadow-sm self-start w-full space-y-5">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-amber-800 text-xs font-semibold uppercase tracking-wider">
          <Clock className="w-3.5 h-3.5" />
          <span>Institutional Verification Pending</span>
        </div>

        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#102341]">
            Registration Pending Review
          </h2>
          <p className="text-xs text-[#65748a] mt-1.5 leading-relaxed">
            Your school account for <strong className="text-[#102341]">{pendingSchoolNotice.schoolName}</strong> is
            currently awaiting Platform Administrator verification.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/60 text-amber-900 text-xs leading-relaxed space-y-2">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block mb-0.5">Recruiting Portal Access Restricted</span>
              To protect student-athlete privacy, recruiting records and athlete contact tools are
              accessible only after institutional credentials have been verified and a permanent
              School ID (SCH-XXXXX) is issued.
            </div>
          </div>
          <div className="text-[11px] text-amber-800/80 border-t border-amber-200/50 pt-2">
            Notification will be sent to: <span className="font-semibold">{pendingSchoolNotice.contactEmail}</span>
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

  const isInvalid = (field: keyof typeof formik.values) =>
    formik.touched[field] && Boolean(formik.errors[field]);

  return (
    <form
      className="bg-white p-7 sm:p-9 border border-slate-200/90 rounded-2xl shadow-sm self-start w-full space-y-4"
      onSubmit={formik.handleSubmit}
      noValidate
    >
      <div className="border-b border-slate-100 pb-4 mb-2">
        <span className="text-[10px] font-bold tracking-widest text-[#65748a] uppercase block mb-1 font-mono">
          WELCOME BACK
        </span>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#102341] m-0">
          Back in the game.
        </h2>
        <p className="text-xs text-[#65748a] mt-1.5 leading-relaxed">
          Sign in to access your verified recruiting portal and manage institutional records.
        </p>
      </div>

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
          className={`w-full rounded-xl border bg-[#f8fafc] px-3.5 py-2.5 text-xs sm:text-sm text-[#102341] focus:bg-white transition-colors outline-none ${
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
          <span className="text-[11px] text-slate-400">
            Forgot password? (Contact admin)
          </span>
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
            className={`w-full rounded-xl border bg-[#f8fafc] px-3.5 py-2.5 pr-11 text-xs sm:text-sm text-[#102341] focus:bg-white transition-colors outline-none ${
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
        className="w-full py-3.5 px-6 rounded-full bg-[#102341] text-white font-bold text-xs sm:text-sm hover:bg-[#1d3d68] disabled:opacity-60 transition-colors shadow-sm inline-flex items-center justify-center gap-2 cursor-pointer mt-2"
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

      <div className="text-center pt-2 border-t border-slate-100">
        <span className="text-xs text-[#65748a]">
          New school or athletic department?{" "}
          <SiteLink href="/school-registration" className="font-semibold text-[#102341] hover:underline">
            Register your school ↗
          </SiteLink>
        </span>
      </div>
    </form>
  );
}
