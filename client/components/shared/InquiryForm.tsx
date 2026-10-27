"use client";

import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
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

export default function InquiryForm({ type }: { type: FormType }) {
  const [status, setStatus] = useState("");
  const { eyebrow, heading, submit } = copy[type];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(
      type === "login"
        ? "This login is a preview. Account authentication is not connected yet."
        : "Your form is complete. This preview does not send information yet; submission will be available when the service launches."
    );
  }

  return (
    <form
      className="bg-white p-7 sm:p-9 border border-slate-200/90 rounded-2xl shadow-sm self-start w-full space-y-4"
      onSubmit={handleSubmit}
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
        <label className="block text-xs font-semibold text-[#102341] space-y-1.5">
          <span>Full name</span>
          <input
            name="name"
            autoComplete="name"
            required
            placeholder="Alex Morgan"
            className="w-full rounded-xl border border-slate-200 bg-[#f8fafc] px-3.5 py-2.5 text-xs sm:text-sm text-[#102341] focus:bg-white focus:border-blue-600 focus:outline-none transition-colors"
          />
        </label>
      )}

      {type === "school" && (
        <>
          <label className="block text-xs font-semibold text-[#102341] space-y-1.5">
            <span>School or institution</span>
            <input
              name="school"
              required
              placeholder="Your school name"
              className="w-full rounded-xl border border-slate-200 bg-[#f8fafc] px-3.5 py-2.5 text-xs sm:text-sm text-[#102341] focus:bg-white focus:border-blue-600 focus:outline-none transition-colors"
            />
          </label>
          <label className="block text-xs font-semibold text-[#102341] space-y-1.5">
            <span>Your role</span>
            <select
              name="role"
              required
              defaultValue=""
              className="w-full rounded-xl border border-slate-200 bg-[#f8fafc] px-3.5 py-2.5 text-xs sm:text-sm text-[#102341] focus:bg-white focus:border-blue-600 focus:outline-none transition-colors"
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
          </label>
        </>
      )}

      <label className="block text-xs font-semibold text-[#102341] space-y-1.5">
        <span>{type === "school" ? "School email" : "Email address"}</span>
        <input
          type="email"
          name="email"
          autoComplete="email"
          required
          placeholder="you@school.edu"
          className="w-full rounded-xl border border-slate-200 bg-[#f8fafc] px-3.5 py-2.5 text-xs sm:text-sm text-[#102341] focus:bg-white focus:border-blue-600 focus:outline-none transition-colors"
        />
      </label>

      {type === "login" ? (
        <label className="block text-xs font-semibold text-[#102341] space-y-1.5">
          <span>Password</span>
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            required
            minLength={8}
            placeholder="Enter your password"
            className="w-full rounded-xl border border-slate-200 bg-[#f8fafc] px-3.5 py-2.5 text-xs sm:text-sm text-[#102341] focus:bg-white focus:border-blue-600 focus:outline-none transition-colors"
          />
        </label>
      ) : (
        <label className="block text-xs font-semibold text-[#102341] space-y-1.5">
          <span>{type === "school" ? "Program notes (optional)" : "Your message"}</span>
          <textarea
            name="message"
            required={type === "contact"}
            rows={3}
            placeholder="Tell us a little about your program and goals…"
            className="w-full rounded-xl border border-slate-200 bg-[#f8fafc] px-3.5 py-2.5 text-xs sm:text-sm text-[#102341] focus:bg-white focus:border-blue-600 focus:outline-none transition-colors resize-none"
          />
        </label>
      )}

      {type === "school" && (
        <label className="flex items-start gap-2 text-xs text-[#65748a] font-normal leading-relaxed pt-1">
          <input type="checkbox" required className="mt-1 rounded border-slate-300" />
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
        className="w-full py-3.5 px-6 rounded-full bg-[#102341] text-white font-bold text-xs sm:text-sm hover:bg-[#1d3d68] transition-colors shadow-sm inline-flex items-center justify-center gap-2"
      >
        <span>{submit}</span>
        <ArrowUpRight className="w-4 h-4 text-[#bed8ff]" />
      </button>

      <p className="text-[11px] text-[#65748a] text-center pt-2 m-0">
        Preview form · {type === "login" ? "Authentication" : "Submissions"} coming soon.
      </p>

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
