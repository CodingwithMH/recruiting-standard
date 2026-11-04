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
  ShieldCheck,
  Building2,
  Calendar,
} from "lucide-react";
import SiteLink from "@/components/ui/SiteLink";
import { apiRequest, AuthResponse } from "@/lib/api";
import { saveSession } from "@/lib/auth";

type SignupRole = "ATHLETE" | "PARENT";

const signupSchema = Yup.object({
  globalRole: Yup.string().oneOf(["ATHLETE", "PARENT"]).required(),
  firstName: Yup.string()
    .trim()
    .min(1, "First name is required")
    .max(100)
    .required("First name is required"),
  lastName: Yup.string()
    .trim()
    .min(1, "Last name is required")
    .max(100)
    .required("Last name is required"),
  email: Yup.string()
    .trim()
    .email("Please enter a valid email address")
    .required("Email address is required"),
  phone: Yup.string().trim().max(30, "Phone number is too long"),
  schoolId: Yup.string().when("globalRole", {
    is: "ATHLETE",
    then: (schema) =>
      schema
        .trim()
        .required("School ID is required for student-athletes (e.g. SCH-10492)")
        .matches(
          /^SCH-\d{5}$/i,
          "Please enter a valid School ID format (e.g. SCH-10492)"
        ),
    otherwise: (schema) => schema.notRequired(),
  }),
  dateOfBirth: Yup.string().when("globalRole", {
    is: "ATHLETE",
    then: (schema) =>
      schema
        .required("Date of birth is required")
        .test("age-range", "Athlete must be between 14 and 20 years of age", (value) => {
          if (!value) return false;
          const dob = new Date(value);
          if (isNaN(dob.getTime())) return false;
          const today = new Date();
          let age = today.getFullYear() - dob.getFullYear();
          const monthDiff = today.getMonth() - dob.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
            age--;
          }
          return age >= 14 && age <= 20;
        }),
    otherwise: (schema) => schema.notRequired(),
  }),
  password: Yup.string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must not exceed 128 characters")
    .required("Password is required"),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("password")], "Passwords must match")
    .required("Please confirm your password"),
  agreeToTerms: Yup.bool().oneOf(
    [true],
    "Please confirm the Terms of Use and Privacy Policy"
  ),
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
    description: "Ages 14–20. Must be enrolled at an approved participating school.",
    icon: GraduationCap,
  },
  {
    value: "PARENT",
    label: "Parent / Guardian",
    description: "Request a secure link to your athlete's account. They must approve it first.",
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
      schoolId: "",
      dateOfBirth: "",
      password: "",
      confirmPassword: "",
      agreeToTerms: false,
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
          schoolId:
            values.globalRole === "ATHLETE"
              ? values.schoolId.toUpperCase().trim()
              : undefined,
          dateOfBirth:
            values.globalRole === "ATHLETE" ? values.dateOfBirth : undefined,
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
    `w-full rounded-xl border bg-white px-4 py-3 text-sm text-[#102341] shadow-xs transition-colors outline-none ${
      isInvalid(field)
        ? "border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500"
        : "border-slate-200 focus:border-[#102341] focus:ring-1 focus:ring-[#102341]"
    }`;

  const isAthlete = formik.values.globalRole === "ATHLETE";

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
            Institutional verification
          </span>
          <h2 className="mt-3 text-xl font-bold tracking-tight text-white sm:text-2xl">
            Join the recruiting standard.
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-300">
            Student-athletes must enter their approved School ID and be between 14–20 years of age
            (including re-classified athletes).
          </p>
        </div>
      </div>

      <div className="space-y-4 p-6 sm:p-7">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {roleOptions.map((option) => {
              const Icon = option.icon;
              const selected = formik.values.globalRole === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => formik.setFieldValue("globalRole", option.value)}
                  className={`cursor-pointer rounded-xl border p-3 text-left transition-all ${
                    selected
                      ? "border-[#102341] bg-[#102341] shadow-md"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60"
                  }`}
                >
                  <span
                    className={`flex items-center gap-2 text-xs font-bold ${
                      selected ? "text-white" : "text-[#102341]"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {option.label}
                  </span>
                  <span
                    className={`mt-0.5 block text-[11px] leading-relaxed ${
                      selected ? "text-slate-300" : "text-[#65748a]"
                    }`}
                  >
                    {option.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Athlete-Specific Verification Fields: School ID & Date of Birth */}
        {isAthlete && (
          <div className="rounded-2xl bg-[#f4f7fc] p-4 border border-blue-100 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#102341]">
              <Building2 className="w-4 h-4 text-blue-600" />
              <span>School Affiliation & Age Verification</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label
                  htmlFor="signup-schoolId"
                  className="block text-xs font-semibold text-[#102341]"
                >
                  Approved School ID *
                </label>
                <input
                  id="signup-schoolId"
                  name="schoolId"
                  type="text"
                  placeholder="SCH-10492"
                  value={formik.values.schoolId}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className={inputClass("schoolId")}
                />
                {isInvalid("schoolId") ? (
                  <p className="text-[11px] text-red-600 font-medium">
                    {formik.errors.schoolId}
                  </p>
                ) : (
                  <p className="text-[10px] text-[#65748a]">
                    Enter the 5-digit ID (SCH-#####) provided by your coach.
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="signup-dateOfBirth"
                  className="block text-xs font-semibold text-[#102341]"
                >
                  Date of Birth (Ages 14–20) *
                </label>
                <div className="relative">
                  <input
                    id="signup-dateOfBirth"
                    name="dateOfBirth"
                    type="date"
                    value={formik.values.dateOfBirth}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className={inputClass("dateOfBirth")}
                  />
                </div>
                {isInvalid("dateOfBirth") ? (
                  <p className="text-[11px] text-red-600 font-medium">
                    {formik.errors.dateOfBirth}
                  </p>
                ) : (
                  <p className="text-[10px] text-[#65748a]">
                    Must be 14–20 years old (supports re-classing).
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

        <div className="space-y-1.5 pt-0.5">
          <label htmlFor="signup-agreeToTerms" className="flex items-start gap-2.5 cursor-pointer">
            <input
              id="signup-agreeToTerms"
              name="agreeToTerms"
              type="checkbox"
              checked={formik.values.agreeToTerms}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-[#102341] focus:ring-[#102341] cursor-pointer"
            />
            <span className="text-[11px] text-[#65748a] leading-relaxed">
              I confirm I am between 14 and 20 years old (or a parent/guardian registering on behalf
              of an athlete), and I agree to the{" "}
              <SiteLink
                href="/terms"
                onClick={(event) => event.stopPropagation()}
                className="font-semibold text-[#102341] hover:underline"
              >
                Terms of Use
              </SiteLink>{" "}
              and{" "}
              <SiteLink
                href="/privacy-policy"
                onClick={(event) => event.stopPropagation()}
                className="font-semibold text-[#102341] hover:underline"
              >
                Privacy Policy
              </SiteLink>
              .
            </span>
          </label>
          {isInvalid("agreeToTerms") && (
            <p className="text-[11px] text-red-600 font-medium">{formik.errors.agreeToTerms}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={formik.isSubmitting}
          className="mt-1 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#102341] px-6 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:bg-[#1d3d68] hover:shadow-lg disabled:opacity-60"
        >
          {formik.isSubmitting ? (
            <span>Verifying & creating account...</span>
          ) : (
            <>
              <span>Create account</span>
              <ArrowUpRight className="w-4 h-4 text-[#bed8ff]" />
            </>
          )}
        </button>

        <div className="border-t border-slate-100 pt-3">
          <SiteLink
            href="/login"
            className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-[#102341] transition-colors hover:border-slate-300 hover:bg-slate-50"
          >
            <span>Already have an account? Log in</span>
            <ArrowUpRight className="h-3.5 w-3.5 text-slate-500" />
          </SiteLink>
        </div>
      </div>
    </form>
  );
}
