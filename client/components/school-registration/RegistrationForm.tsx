"use client";

import { useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import {
  ArrowUpRight,
  AlertCircle,
  Clock,
  ShieldCheck,
  Eye,
  EyeOff,
} from "lucide-react";
import SiteLink from "@/components/ui/SiteLink";
import { apiRequest } from "@/lib/api";

interface RegistrationSuccessData {
  school: {
    id: string;
    name: string;
    contactEmail: string;
    city: string;
    state: string;
  };
  status: string;
  message: string;
}

const validationSchema = Yup.object({
  schoolName: Yup.string()
    .trim()
    .min(2, "School name must be at least 2 characters")
    .max(150, "School name cannot exceed 150 characters")
    .required("Official School / Institution Name is required"),
  athleticDirectorName: Yup.string()
    .trim()
    .min(2, "Primary administrator name is required")
    .max(100, "Name cannot exceed 100 characters")
    .required("Athletic Director or Primary Administrator Name is required"),
  contactEmail: Yup.string()
    .trim()
    .email("Please enter a valid institutional email address")
    .required("Official Institutional Email is required"),
  contactPhone: Yup.string()
    .trim()
    .min(7, "Please enter a valid contact phone number")
    .max(20, "Phone number cannot exceed 20 characters")
    .required("Contact Phone Number is required"),
  address: Yup.string()
    .trim()
    .min(2, "School street address is required")
    .max(200, "Address is too long")
    .required("School Street Address is required"),
  city: Yup.string()
    .trim()
    .min(2, "City is required")
    .max(100, "City cannot exceed 100 characters")
    .required("City is required"),
  state: Yup.string()
    .trim()
    .min(2, "State is required")
    .max(50, "State cannot exceed 50 characters")
    .required("State is required"),
  zipCode: Yup.string()
    .trim()
    .min(3, "Zip code is required")
    .max(20, "Zip code cannot exceed 20 characters")
    .required("Zip Code is required"),
  password: Yup.string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password cannot exceed 128 characters")
    .required("Initial Admin Account Password is required"),
  plan: Yup.string()
    .oneOf(["ANNUAL_1500", "MONTHLY_250"])
    .required("Please select a subscription plan"),
});

export default function RegistrationForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<RegistrationSuccessData | null>(null);

  const formik = useFormik({
    initialValues: {
      schoolName: "",
      athleticDirectorName: "",
      contactEmail: "",
      contactPhone: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      password: "",
      plan: "ANNUAL_1500" as "ANNUAL_1500" | "MONTHLY_250",
    },
    validationSchema,
    onSubmit: async (values, { setSubmitting, setErrors }) => {
      setServerError(null);

      const response = await apiRequest<RegistrationSuccessData>("schools/register", {
        method: "POST",
        body: JSON.stringify(values),
      });

      setSubmitting(false);

      if (!response.success) {
        setServerError(response.error || "Registration failed. Please review your inputs.");
        if (response.details) {
          const formattedErrors: Record<string, string> = {};
          Object.entries(response.details).forEach(([key, messages]) => {
            if (messages && messages.length > 0) {
              formattedErrors[key] = messages[0];
            }
          });
          setErrors(formattedErrors);
        }
        return;
      }

      if (response.data) {
        setSuccessData(response.data);
      }
    },
  });

  if (successData) {
    return (
      <div className="bg-white p-8 sm:p-10 border border-slate-200/90 rounded-2xl shadow-sm self-start w-full space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-amber-800 text-xs font-semibold uppercase tracking-wider">
          <Clock className="w-3.5 h-3.5" />
          <span>Status: Pending Review</span>
        </div>

        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#102341] mb-2">
            Registration Received
          </h2>
          <p className="text-sm text-[#65748a] leading-relaxed">
            Thank you for registering <strong className="text-[#102341]">{successData.school.name}</strong>.
            Your application has been received and entered into the institutional verification queue.
          </p>
        </div>

        <div className="bg-[#f4f7fc] rounded-xl p-5 border border-slate-200/80 space-y-3">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-xs text-[#65748a] leading-relaxed">
              <span className="font-bold text-[#102341] block mb-0.5">What happens next?</span>
              Platform administrators will verify your school credentials. Upon approval, your permanent
              immutable <span className="font-semibold text-[#102341]">School ID (e.g. SCH-XXXXX)</span> will be issued
              and your recruiting portal access will be unlocked.
            </div>
          </div>
          <div className="text-xs text-[#65748a] border-t border-slate-200/60 pt-3">
            Confirmation email sent to: <span className="font-semibold text-[#102341]">{successData.school.contactEmail}</span>
          </div>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-3">
          <SiteLink
            href="/login"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#102341] text-white hover:bg-[#1d3d68] transition-colors text-sm font-semibold shadow-xs"
          >
            <span>Go to Portal Login</span>
            <ArrowUpRight className="w-4 h-4" />
          </SiteLink>
          <SiteLink
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 rounded-full border border-slate-200 text-[#102341] hover:bg-slate-50 transition-colors text-sm font-semibold"
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
      className="bg-white p-7 sm:p-9 border border-slate-200/90 rounded-2xl shadow-sm self-start w-full space-y-5"
      onSubmit={formik.handleSubmit}
      noValidate
    >
      <div className="border-b border-slate-100 pb-4">
        <span className="text-[10px] font-bold tracking-widest text-[#65748a] uppercase block mb-1 font-mono">
          YOUR NEXT GREAT RECRUIT STARTS HERE
        </span>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#102341] m-0">
          Bring your school on board.
        </h2>
        <p className="text-xs text-[#65748a] mt-1.5 leading-relaxed">
          Complete the form below to request institutional verification. Status remains Pending until approved.
        </p>
      </div>

      {serverError && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
          <div>
            <span className="font-semibold block mb-0.5">Registration Error</span>
            <span>{serverError}</span>
          </div>
        </div>
      )}

      {/* School Name */}
      <div className="space-y-1.5">
        <label htmlFor="schoolName" className="block text-xs font-semibold text-[#102341]">
          Official School / Institution Name
        </label>
        <input
          id="schoolName"
          name="schoolName"
          value={formik.values.schoolName}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          placeholder="e.g. Lincoln High School"
          className={`w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-[#102341] outline-none transition ${
            isInvalid("schoolName")
              ? "border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500"
              : "border-slate-200 focus:border-[#102341] focus:ring-1 focus:ring-[#102341]"
          }`}
        />
        {isInvalid("schoolName") && (
          <p className="text-[11px] text-red-600 font-medium">{formik.errors.schoolName}</p>
        )}
      </div>

      {/* Athletic Director Name */}
      <div className="space-y-1.5">
        <label htmlFor="athleticDirectorName" className="block text-xs font-semibold text-[#102341]">
          Athletic Director or Primary Administrator Name
        </label>
        <input
          id="athleticDirectorName"
          name="athleticDirectorName"
          value={formik.values.athleticDirectorName}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          placeholder="e.g. Coach Marcus Vance"
          className={`w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-[#102341] outline-none transition ${
            isInvalid("athleticDirectorName")
              ? "border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500"
              : "border-slate-200 focus:border-[#102341] focus:ring-1 focus:ring-[#102341]"
          }`}
        />
        {isInvalid("athleticDirectorName") && (
          <p className="text-[11px] text-red-600 font-medium">{formik.errors.athleticDirectorName}</p>
        )}
      </div>

      {/* Contact Email & Phone */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="contactEmail" className="block text-xs font-semibold text-[#102341]">
            Official Institutional Email
          </label>
          <input
            id="contactEmail"
            name="contactEmail"
            type="email"
            value={formik.values.contactEmail}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            placeholder="ad@school.org"
            className={`w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-[#102341] outline-none transition ${
              isInvalid("contactEmail")
                ? "border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                : "border-slate-200 focus:border-[#102341] focus:ring-1 focus:ring-[#102341]"
            }`}
          />
          {isInvalid("contactEmail") && (
            <p className="text-[11px] text-red-600 font-medium">{formik.errors.contactEmail}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="contactPhone" className="block text-xs font-semibold text-[#102341]">
            Contact Phone Number
          </label>
          <input
            id="contactPhone"
            name="contactPhone"
            type="tel"
            value={formik.values.contactPhone}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            placeholder="(555) 000-0000"
            className={`w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-[#102341] outline-none transition ${
              isInvalid("contactPhone")
                ? "border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                : "border-slate-200 focus:border-[#102341] focus:ring-1 focus:ring-[#102341]"
            }`}
          />
          {isInvalid("contactPhone") && (
            <p className="text-[11px] text-red-600 font-medium">{formik.errors.contactPhone}</p>
          )}
        </div>
      </div>

      {/* Street Address */}
      <div className="space-y-1.5">
        <label htmlFor="address" className="block text-xs font-semibold text-[#102341]">
          School Street Address
        </label>
        <input
          id="address"
          name="address"
          value={formik.values.address}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          placeholder="1234 High School Way"
          className={`w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-[#102341] outline-none transition ${
            isInvalid("address")
              ? "border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500"
              : "border-slate-200 focus:border-[#102341] focus:ring-1 focus:ring-[#102341]"
          }`}
        />
        {isInvalid("address") && (
          <p className="text-[11px] text-red-600 font-medium">{formik.errors.address}</p>
        )}
      </div>

      {/* City, State, Zip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <label htmlFor="city" className="block text-xs font-semibold text-[#102341]">City</label>
          <input
            id="city"
            name="city"
            value={formik.values.city}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            placeholder="Lincoln"
            className={`w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-[#102341] outline-none transition ${
              isInvalid("city")
                ? "border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                : "border-slate-200 focus:border-[#102341] focus:ring-1 focus:ring-[#102341]"
            }`}
          />
          {isInvalid("city") && (
            <p className="text-[11px] text-red-600 font-medium">{formik.errors.city}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="state" className="block text-xs font-semibold text-[#102341]">State</label>
          <input
            id="state"
            name="state"
            value={formik.values.state}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            placeholder="Nebraska"
            className={`w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-[#102341] outline-none transition ${
              isInvalid("state")
                ? "border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                : "border-slate-200 focus:border-[#102341] focus:ring-1 focus:ring-[#102341]"
            }`}
          />
          {isInvalid("state") && (
            <p className="text-[11px] text-red-600 font-medium">{formik.errors.state}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="zipCode" className="block text-xs font-semibold text-[#102341]">Zip Code</label>
          <input
            id="zipCode"
            name="zipCode"
            value={formik.values.zipCode}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            placeholder="68508"
            className={`w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-[#102341] outline-none transition ${
              isInvalid("zipCode")
                ? "border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                : "border-slate-200 focus:border-[#102341] focus:ring-1 focus:ring-[#102341]"
            }`}
          />
          {isInvalid("zipCode") && (
            <p className="text-[11px] text-red-600 font-medium">{formik.errors.zipCode}</p>
          )}
        </div>
      </div>

      {/* Account Password with Eye Toggle */}
      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-xs font-semibold text-[#102341]">
          Initial Admin Account Password (min 8 characters)
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            value={formik.values.password}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            placeholder="••••••••••••"
            className={`w-full rounded-xl border bg-white px-4 py-2.5 pr-11 text-sm text-[#102341] outline-none transition ${
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

      {/* Preferred Plan Selection */}
      <div className="space-y-2 pt-1">
        <label className="block text-xs font-semibold text-[#102341]">
          Preferred Subscription Plan
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label
            className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
              formik.values.plan === "ANNUAL_1500"
                ? "border-[#102341] bg-slate-50 ring-1 ring-[#102341]"
                : "border-slate-200 bg-white hover:bg-slate-50/60"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-[#102341]">Annual Plan</span>
              <input
                type="radio"
                name="plan"
                value="ANNUAL_1500"
                checked={formik.values.plan === "ANNUAL_1500"}
                onChange={() => formik.setFieldValue("plan", "ANNUAL_1500")}
                className="text-[#102341]"
              />
            </div>
            <div className="text-sm font-bold text-[#102341]">$1,500 <span className="text-xs font-normal text-[#65748a]">/ year</span></div>
            <span className="text-[10px] text-emerald-700 font-semibold mt-1">Recommended for athletic depts</span>
          </label>

          <label
            className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
              formik.values.plan === "MONTHLY_250"
                ? "border-[#102341] bg-slate-50 ring-1 ring-[#102341]"
                : "border-slate-200 bg-white hover:bg-slate-50/60"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-[#102341]">Monthly Plan</span>
              <input
                type="radio"
                name="plan"
                value="MONTHLY_250"
                checked={formik.values.plan === "MONTHLY_250"}
                onChange={() => formik.setFieldValue("plan", "MONTHLY_250")}
                className="text-[#102341]"
              />
            </div>
            <div className="text-sm font-bold text-[#102341]">$250 <span className="text-xs font-normal text-[#65748a]">/ month</span></div>
            <span className="text-[10px] text-[#65748a] mt-1">Flexible month-to-month</span>
          </label>
        </div>
      </div>

      {/* Submit Button */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={formik.isSubmitting}
          className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-[#102341] text-white hover:bg-[#1d3d68] disabled:opacity-60 transition-colors text-sm font-semibold shadow-xs cursor-pointer"
        >
          {formik.isSubmitting ? (
            <span>Submitting institutional registration...</span>
          ) : (
            <>
              <span>Submit Registration (Pending Review)</span>
              <ArrowUpRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      <div className="text-center pt-1">
        <span className="text-xs text-[#65748a]">
          Already have an approved account?{" "}
          <SiteLink href="/login" className="text-[#102341] font-semibold hover:underline">
            Log in to portal
          </SiteLink>
        </span>
      </div>
    </form>
  );
}
