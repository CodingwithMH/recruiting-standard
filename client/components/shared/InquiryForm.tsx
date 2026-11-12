"use client";

import { useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import {
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  Mail,
  ShieldAlert,
} from "lucide-react";
import SiteLink from "@/components/ui/SiteLink";
import { apiRequest } from "@/lib/api";
import {
  CONTACT_EMAIL,
  CONTACT_EMAIL_HREF,
  CONTACT_RESPONSE_TIME,
  INQUIRY_OPTIONS,
  getInquiryLabel,
} from "@/lib/contact";

type FormType = "contact" | "school" | "login";

type FormStatus = {
  tone: "info" | "error";
  message: string;
};

interface ContactConfirmation {
  name: string;
  email: string;
  inquiryType: string;
  recipient: string;
}

const copy: Record<FormType, { eyebrow: string; heading: string; submit: string }> = {
  login: {
    eyebrow: "WELCOME BACK",
    heading: "Back in the game.",
    submit: "Log in",
  },
  school: {
    eyebrow: "YOUR NEXT GREAT RECRUIT STARTS HERE",
    heading: "Bring your school on board.",
    submit: "Request school access",
  },
  contact: {
    eyebrow: "LET’S TALK",
    heading: "Contact MVP 4.18.",
    submit: "Send message",
  },
};

const validationSchema = (type: FormType) =>
  Yup.object({
    name:
      type !== "login"
        ? Yup.string().trim().required("Name is required")
        : Yup.string(),
    school:
      type === "school"
        ? Yup.string().trim().required("School name is required")
        : Yup.string(),
    role:
      type === "school"
        ? Yup.string().required("Please select your role")
        : Yup.string(),
    email: Yup.string()
      .trim()
      .email("Please enter a valid email address")
      .required("Email address is required"),
    inquiryType:
      type === "contact"
        ? Yup.string()
            .oneOf(
              INQUIRY_OPTIONS.map((option) => option.value),
              "Please select an inquiry type"
            )
            .required("Please select an inquiry type")
        : Yup.string(),
    password:
      type === "login"
        ? Yup.string().min(8, "Password must be at least 8 characters").required("Password is required")
        : Yup.string(),
    message:
      type === "contact"
        ? Yup.string().trim().required("Message is required")
        : Yup.string(),
    terms:
      type === "school"
        ? Yup.boolean().oneOf([true], "You must accept the terms")
        : Yup.boolean(),
  });

export default function InquiryForm({ type }: { type: FormType }) {
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<FormStatus | null>(null);
  const [confirmation, setConfirmation] = useState<ContactConfirmation | null>(null);
  const { eyebrow, heading, submit } = copy[type];

  const formik = useFormik({
    initialValues: {
      name: "",
      school: "",
      role: "",
      email: "",
      inquiryType: "",
      password: "",
      message: "",
      terms: false,
    },
    validationSchema: validationSchema(type),
    onSubmit: async (values, { resetForm, setSubmitting }) => {
      setStatus(null);

      if (type === "contact") {
        const response = await apiRequest<{
          recipient: string;
          inquiryType: string;
        }>("/contact", {
          method: "POST",
          body: JSON.stringify({
            name: values.name,
            email: values.email,
            inquiryType: values.inquiryType,
            message: values.message,
          }),
        });

        setSubmitting(false);

        if (!response.success) {
          setStatus({
            tone: "error",
            message:
              response.error ||
              `We could not deliver your message. Please email ${CONTACT_EMAIL} directly.`,
          });
          return;
        }

        setConfirmation({
          name: values.name,
          email: values.email,
          inquiryType: values.inquiryType,
          recipient: response.data?.recipient || CONTACT_EMAIL,
        });
        resetForm();
        return;
      }

      setStatus({
        tone: "info",
        message:
          type === "login"
            ? "This login is a preview. Interactive portal login is being wired in Step 2.4."
            : "Your inquiry has been received. Our institutional admissions team will be in touch shortly.",
      });
      setSubmitting(false);
      resetForm();
    },
  });

  const isInvalid = (field: keyof typeof formik.values) =>
    formik.touched[field] && Boolean(formik.errors[field]);

  if (type === "contact" && confirmation) {
    const firstName = confirmation.name.trim().split(/\s+/)[0] || "there";

    return (
      <div className="bg-white p-7 sm:p-9 border border-slate-200/90 rounded-2xl shadow-sm self-start w-full space-y-5">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-semibold uppercase tracking-wider">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Message received</span>
        </div>

        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#102341] mb-2">
            Thanks, {firstName}.
          </h2>
          <p className="text-sm text-[#65748a] leading-relaxed">
            Your {getInquiryLabel(confirmation.inquiryType).toLowerCase()} message was
            delivered to the MVP 4.18 team inbox. We will reply to{" "}
            <span className="font-semibold text-[#102341]">{confirmation.email}</span>.
          </p>
        </div>

        <div className="bg-[#f4f7fc] rounded-xl p-5 border border-slate-200/80 space-y-3">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-xs text-[#65748a] leading-relaxed">
              <span className="font-bold text-[#102341] block mb-0.5">
                What happens next?
              </span>
              {CONTACT_RESPONSE_TIME} If your message is time-sensitive, you can
              also reach us directly at{" "}
              <a
                href={CONTACT_EMAIL_HREF}
                className="font-semibold text-[#102341] underline"
              >
                {CONTACT_EMAIL}
              </a>
              .
            </div>
          </div>
          <div className="flex items-start gap-3 border-t border-slate-200/60 pt-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-[#65748a] leading-relaxed">
              Please do not send transcripts or other student records by email. Use
              the secure athlete portal to upload documents.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setConfirmation(null)}
          className="w-full py-3.5 px-6 rounded-full border border-slate-200 text-[#102341] font-bold text-xs sm:text-sm hover:bg-slate-50 transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Send another message</span>
          <ArrowUpRight className="w-4 h-4" />
        </button>
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
          {eyebrow}
        </span>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#102341] m-0">
          {heading}
        </h2>
      </div>

      {type !== "login" && (
        <div className="space-y-1.5">
          <label htmlFor="name" className="block text-xs font-semibold text-[#102341]">
            Full name
          </label>
          <input
            id="name"
            name="name"
            autoComplete="name"
            value={formik.values.name}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            placeholder="Alex Morgan"
            className={`w-full rounded-xl border bg-[#f8fafc] px-3.5 py-2.5 text-xs sm:text-sm text-[#102341] focus:bg-white transition-colors outline-none ${
              isInvalid("name")
                ? "border-red-400 focus:border-red-500"
                : "border-slate-200 focus:border-blue-600"
            }`}
          />
          {isInvalid("name") && (
            <p className="text-[11px] text-red-600 font-medium">{formik.errors.name}</p>
          )}
        </div>
      )}

      {type === "school" && (
        <>
          <div className="space-y-1.5">
            <label htmlFor="school" className="block text-xs font-semibold text-[#102341]">
              School or institution
            </label>
            <input
              id="school"
              name="school"
              value={formik.values.school}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              placeholder="Your school name"
              className={`w-full rounded-xl border bg-[#f8fafc] px-3.5 py-2.5 text-xs sm:text-sm text-[#102341] focus:bg-white transition-colors outline-none ${
                isInvalid("school")
                  ? "border-red-400 focus:border-red-500"
                  : "border-slate-200 focus:border-blue-600"
              }`}
            />
            {isInvalid("school") && (
              <p className="text-[11px] text-red-600 font-medium">{formik.errors.school}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="role" className="block text-xs font-semibold text-[#102341]">
              Your role
            </label>
            <select
              id="role"
              name="role"
              value={formik.values.role}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className={`w-full rounded-xl border bg-[#f8fafc] px-3.5 py-2.5 text-xs sm:text-sm text-[#102341] focus:bg-white transition-colors outline-none ${
                isInvalid("role")
                  ? "border-red-400 focus:border-red-500"
                  : "border-slate-200 focus:border-blue-600"
              }`}
            >
              <option value="" disabled>
                Select your role
              </option>
              <option>Athletic director</option>
              <option>Head Coach</option>
              <option>Assistant Coach / Recruiter</option>
              <option>Admissions team</option>
              <option>Other</option>
            </select>
            {isInvalid("role") && (
              <p className="text-[11px] text-red-600 font-medium">{formik.errors.role}</p>
            )}
          </div>
        </>
      )}

      {type === "contact" && (
        <div className="space-y-1.5">
          <label htmlFor="inquiryType" className="block text-xs font-semibold text-[#102341]">
            What is this about?
          </label>
          <select
            id="inquiryType"
            name="inquiryType"
            value={formik.values.inquiryType}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            className={`w-full rounded-xl border bg-[#f8fafc] px-3.5 py-2.5 text-xs sm:text-sm text-[#102341] focus:bg-white transition-colors outline-none ${
              isInvalid("inquiryType")
                ? "border-red-400 focus:border-red-500"
                : "border-slate-200 focus:border-blue-600"
            }`}
          >
            <option value="" disabled>
              Select an inquiry type
            </option>
            {INQUIRY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {isInvalid("inquiryType") && (
            <p className="text-[11px] text-red-600 font-medium">
              {formik.errors.inquiryType}
            </p>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-xs font-semibold text-[#102341]">
          {type === "school" ? "School email" : "Email address"}
        </label>
        <input
          id="email"
          type="email"
          name="email"
          autoComplete="email"
          value={formik.values.email}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          placeholder="you@school.edu"
          className={`w-full rounded-xl border bg-[#f8fafc] px-3.5 py-2.5 text-xs sm:text-sm text-[#102341] focus:bg-white transition-colors outline-none ${
            isInvalid("email")
              ? "border-red-400 focus:border-red-500"
              : "border-slate-200 focus:border-blue-600"
          }`}
        />
        {isInvalid("email") && (
          <p className="text-[11px] text-red-600 font-medium">{formik.errors.email}</p>
        )}
      </div>

      {type === "login" ? (
        <div className="space-y-1.5">
          <label htmlFor="login-password" className="block text-xs font-semibold text-[#102341]">
            Password
          </label>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              name="password"
              autoComplete="current-password"
              value={formik.values.password}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              placeholder="Enter your password"
              className={`w-full rounded-xl border bg-[#f8fafc] px-3.5 py-2.5 pr-10 text-xs sm:text-sm text-[#102341] focus:bg-white transition-colors outline-none ${
                isInvalid("password")
                  ? "border-red-400 focus:border-red-500"
                  : "border-slate-200 focus:border-blue-600"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer transition-colors"
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
      ) : (
        <div className="space-y-1.5">
          <label htmlFor="message" className="block text-xs font-semibold text-[#102341]">
            {type === "school" ? "Program notes (optional)" : "Your message"}
          </label>
          {type === "contact" && (
            <p className="flex items-start gap-2 rounded-lg border border-amber-200/70 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-900">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>
                Do not include transcripts or other student records here. Use the{" "}
                <SiteLink
                  href="/portal/athlete"
                  className="font-semibold underline text-[#102341]"
                >
                  secure athlete portal
                </SiteLink>{" "}
                to upload documents.
              </span>
            </p>
          )}
          <textarea
            id="message"
            name="message"
            rows={3}
            value={formik.values.message}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            placeholder="Tell us a little about your program and goals…"
            className={`w-full rounded-xl border bg-[#f8fafc] px-3.5 py-2.5 text-xs sm:text-sm text-[#102341] focus:bg-white transition-colors resize-none outline-none ${
              isInvalid("message")
                ? "border-red-400 focus:border-red-500"
                : "border-slate-200 focus:border-blue-600"
            }`}
          />
          {isInvalid("message") && (
            <p className="text-[11px] text-red-600 font-medium">{formik.errors.message}</p>
          )}
        </div>
      )}

      {type === "school" && (
        <label className="flex items-start gap-2 text-xs text-[#65748a] font-normal leading-relaxed pt-1">
          <input
            type="checkbox"
            name="terms"
            checked={formik.values.terms}
            onChange={formik.handleChange}
            className="mt-1 rounded border-slate-300"
          />
          <span>
            I have read the{" "}
            <SiteLink href="/terms" className="underline text-[#102341]">
              Terms
            </SiteLink>{" "}
            and{" "}
            <SiteLink href="/privacy-policy" className="underline text-[#102341]">
              Privacy Policy
            </SiteLink>
            .
          </span>
        </label>
      )}

      <button
        type="submit"
        disabled={formik.isSubmitting}
        className="w-full py-3.5 px-6 rounded-full bg-[#102341] text-white font-bold text-xs sm:text-sm hover:bg-[#1d3d68] transition-colors shadow-sm inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <span>{formik.isSubmitting ? "Sending…" : submit}</span>
        <ArrowUpRight className="w-4 h-4 text-[#bed8ff]" />
      </button>

      {status && (
        <p
          role="status"
          className={`p-3 rounded-xl border text-xs leading-relaxed ${
            status.tone === "error"
              ? "bg-red-50 border-red-200 text-red-900"
              : "bg-blue-50 border-blue-200 text-blue-900"
          }`}
        >
          {status.message}
        </p>
      )}

      {type === "contact" && (
        <p className="flex items-center justify-center gap-1.5 text-xs text-center text-[#65748a] pt-1">
          <Mail className="w-3.5 h-3.5" />
          <span>Prefer email? </span>
          <a
            href={CONTACT_EMAIL_HREF}
            className="font-semibold text-[#102341] underline"
          >
            {CONTACT_EMAIL}
          </a>
        </p>
      )}

      {type === "login" && (
        <p className="text-xs text-center text-[#65748a] pt-2">
          New here?{" "}
          <SiteLink href="/school-registration" className="font-semibold text-[#102341] underline">
            Register your school ↗
          </SiteLink>
        </p>
      )}
    </form>
  );
}
