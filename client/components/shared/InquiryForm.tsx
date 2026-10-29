"use client";

import { useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { ArrowUpRight, Eye, EyeOff } from "lucide-react";
import SiteLink from "@/components/ui/SiteLink";

type FormType = "contact" | "school" | "login";

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
    heading: "Start a conversation.",
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
  const [status, setStatus] = useState("");
  const { eyebrow, heading, submit } = copy[type];

  const formik = useFormik({
    initialValues: {
      name: "",
      school: "",
      role: "",
      email: "",
      password: "",
      message: "",
      terms: false,
    },
    validationSchema: validationSchema(type),
    onSubmit: (_values, { resetForm }) => {
      setStatus(
        type === "login"
          ? "This login is a preview. Interactive portal login is being wired in Step 2.4."
          : "Your inquiry has been received. Our institutional admissions team will be in touch shortly."
      );
      resetForm();
    },
  });

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
        className="w-full py-3.5 px-6 rounded-full bg-[#102341] text-white font-bold text-xs sm:text-sm hover:bg-[#1d3d68] transition-colors shadow-sm inline-flex items-center justify-center gap-2 cursor-pointer"
      >
        <span>{submit}</span>
        <ArrowUpRight className="w-4 h-4 text-[#bed8ff]" />
      </button>

      {status && (
        <p
          role="status"
          className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 leading-relaxed"
        >
          {status}
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
