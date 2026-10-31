"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFormik } from "formik";
import * as Yup from "yup";
import {
  ArrowUpRight,
  AlertCircle,
  GraduationCap,
  Users,
  Eye,
  EyeOff,
} from "lucide-react";
import SiteLink from "@/components/ui/SiteLink";
import { apiRequest, AuthResponse } from "@/lib/api";
import { saveSession } from "@/lib/auth";

type SignupRole = "ATHLETE" | "PARENT";

const signupSchema = Yup.object({
  globalRole: Yup.string().oneOf(["ATHLETE", "PARENT"]).required(),
  firstName: Yup.string().trim().min(1, "First name is required").max(100).required("First name is required"),
  lastName: Yup.string().trim().min(1, "Last name is required").max(100).required("Last name is required"),
  email: Yup.string()
    .trim()
    .email("Please enter a valid email address")
    .required("Email address is required"),
  phone: Yup.string().trim().max(30, "Phone number is too long"),
  password: Yup.string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must not exceed 128 characters")
    .required("Password is required"),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("password")], "Passwords must match")
    .required("Please confirm your password"),
});

const roleOptions: Array<{
  value: SignupRole;
  label: string;
  description: string;
  icon: typeof GraduationCap;
}> = [
  {
    value: "ATHLETE",
    label: "Student-Athlete",
    description: "Build your profile, upload documents, and track verification.",
    icon: GraduationCap,
  },
  {
    value: "PARENT",
    label: "Parent / Guardian",
    description: "Request access to your linked athlete's recruiting account.",
    icon: Users,
  },
];

export default function SignupForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const formik = useFormik({
    initialValues: {
      globalRole: "ATHLETE" as SignupRole,
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
    validationSchema: signupSchema,
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      setServerError(null);

      const response = await apiRequest<AuthResponse>("auth/register", {
        method: "POST",
        body: JSON.stringify({
          globalRole: values.globalRole,
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          phone: values.phone || undefined,
          password: values.password,
        }),
      });

      setSubmitting(false);

      if (!response.success || !response.data) {
        setServerError(
          response.error || "Unable to create your account. Please try again."
        );
        return;
      }

      saveSession(response.data.token, response.data.user);
      resetForm();

      router.replace(
        response.data.user.globalRole === "PARENT"
          ? "/portal/parent"
          : "/portal/athlete"
      );
    },
  });

  const isInvalid = (field: keyof typeof formik.values) =>
    formik.touched[field] && Boolean(formik.errors[field]);

  const inputClass = (field: keyof typeof formik.values) =>
    `w-full rounded-xl border bg-[#f8fafc] px-3.5 py-2.5 text-xs sm:text-sm text-[#102341] focus:bg-white transition-colors outline-none ${
      isInvalid(field)
        ? "border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500"
        : "border-slate-200 focus:border-[#102341] focus:ring-1 focus:ring-[#102341]"
    }`;

  return (
    <form
      className="bg-white p-7 sm:p-9 border border-slate-200/90 rounded-2xl shadow-sm self-start w-full space-y-4"
      onSubmit={formik.handleSubmit}
      noValidate
    >
      <div className="border-b border-slate-100 pb-4 mb-2">
        <span className="text-[10px] font-bold tracking-widest text-[#65748a] uppercase block mb-1 font-mono">
          CREATE YOUR ACCOUNT
        </span>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#102341] m-0">
          Join the recruiting standard.
        </h2>
        <p className="text-xs text-[#65748a] mt-1.5 leading-relaxed">
          Athletes and parents/guardians can create an account here. Schools should use the
          institutional registration flow.
        </p>
      </div>

      {serverError && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
          <div>
            <span className="font-semibold block mb-0.5">Account creation failed</span>
            <span>{serverError}</span>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <span className="block text-xs font-semibold text-[#102341]">I am a...</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {roleOptions.map((option) => {
            const Icon = option.icon;
            const selected = formik.values.globalRole === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => formik.setFieldValue("globalRole", option.value)}
                className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                  selected
                    ? "border-[#102341] bg-slate-50 ring-1 ring-[#102341]"
                    : "border-slate-200 bg-white hover:bg-slate-50/60"
                }`}
              >
                <span className="flex items-center gap-2 text-xs font-bold text-[#102341]">
                  <Icon className="w-4 h-4" />
                  {option.label}
                </span>
                <span className="block text-[11px] text-[#65748a] mt-1 leading-relaxed">
                  {option.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="signup-firstName" className="block text-xs font-semibold text-[#102341]">
            First name
          </label>
          <input
            id="signup-firstName"
            name="firstName"
            value={formik.values.firstName}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            className={inputClass("firstName")}
          />
          {isInvalid("firstName") && (
            <p className="text-[11px] text-red-600 font-medium">{formik.errors.firstName}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="signup-lastName" className="block text-xs font-semibold text-[#102341]">
            Last name
          </label>
          <input
            id="signup-lastName"
            name="lastName"
            value={formik.values.lastName}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            className={inputClass("lastName")}
          />
          {isInvalid("lastName") && (
            <p className="text-[11px] text-red-600 font-medium">{formik.errors.lastName}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="signup-email" className="block text-xs font-semibold text-[#102341]">
            Email address
          </label>
          <input
            id="signup-email"
            name="email"
            type="email"
            autoComplete="email"
            value={formik.values.email}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            className={inputClass("email")}
          />
          {isInvalid("email") && (
            <p className="text-[11px] text-red-600 font-medium">{formik.errors.email}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="signup-phone" className="block text-xs font-semibold text-[#102341]">
            Phone (optional)
          </label>
          <input
            id="signup-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            value={formik.values.phone}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            className={inputClass("phone")}
          />
          {isInvalid("phone") && (
            <p className="text-[11px] text-red-600 font-medium">{formik.errors.phone}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="signup-password" className="block text-xs font-semibold text-[#102341]">
            Password
          </label>
          <div className="relative">
            <input
              id="signup-password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={formik.values.password}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className={`${inputClass("password")} pr-11`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-1 cursor-pointer transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {isInvalid("password") && (
            <p className="text-[11px] text-red-600 font-medium">{formik.errors.password}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="signup-confirmPassword" className="block text-xs font-semibold text-[#102341]">
            Confirm password
          </label>
          <input
            id="signup-confirmPassword"
            name="confirmPassword"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            value={formik.values.confirmPassword}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            className={inputClass("confirmPassword")}
          />
          {isInvalid("confirmPassword") && (
            <p className="text-[11px] text-red-600 font-medium">{formik.errors.confirmPassword}</p>
          )}
        </div>
      </div>

      <button
        type="submit"
        disabled={formik.isSubmitting}
        className="w-full py-3.5 px-6 rounded-full bg-[#102341] text-white font-bold text-xs sm:text-sm hover:bg-[#1d3d68] disabled:opacity-60 transition-colors shadow-sm inline-flex items-center justify-center gap-2 cursor-pointer mt-2"
      >
        {formik.isSubmitting ? (
          <span>Creating account...</span>
        ) : (
          <>
            <span>Create account</span>
            <ArrowUpRight className="w-4 h-4 text-[#bed8ff]" />
          </>
        )}
      </button>

      <div className="text-center pt-2 border-t border-slate-100">
        <span className="text-xs text-[#65748a]">
          Already have an account?{" "}
          <SiteLink href="/login" className="font-semibold text-[#102341] hover:underline">
            Log in
          </SiteLink>
        </span>
      </div>
    </form>
  );
}
