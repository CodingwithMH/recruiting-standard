"use client";

import { useEffect, useState } from "react";
import { AlertCircle, ArrowUpRight, CheckCircle2, Clock, ShieldCheck } from "lucide-react";
import SiteLink from "@/components/ui/SiteLink";
import {
  apiRequest,
  GuardianAuthorizationConfirmation,
  GuardianAuthorizationDetails,
} from "@/lib/api";

export default function GuardianAuthorizationForm({ token }: { token: string }) {
  const [details, setDetails] = useState<GuardianAuthorizationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] =
    useState<GuardianAuthorizationConfirmation | null>(null);

  useEffect(() => {
    let active = true;

    async function loadDetails() {
      if (!token) {
        setError("This guardian authorization link is missing its token.");
        setLoading(false);
        return;
      }

      const response = await apiRequest<GuardianAuthorizationDetails>(
        `auth/guardian-authorization/${encodeURIComponent(token)}`
      );

      if (!active) return;

      if (!response.success || !response.data) {
        setError(
          response.error || "Unable to load this guardian authorization request."
        );
      } else {
        setDetails(response.data);
        if (response.data.status === "AUTHORIZED") {
          setConfirmation({
            id: response.data.id,
            status: "AUTHORIZED",
            authorizedAt: response.data.authorizedAt || response.data.expiresAt,
            authorizationVersion: response.data.version,
          });
        }
      }

      setLoading(false);
    }

    void loadDetails();
    return () => {
      active = false;
    };
  }, [token]);

  async function handleConfirm() {
    if (!details || !accepted) return;

    setSubmitting(true);
    setError(null);

    const response = await apiRequest<GuardianAuthorizationConfirmation>(
      "auth/guardian-authorization/confirm",
      {
        method: "POST",
        body: JSON.stringify({
          token,
          authorizationAccepted: true,
          version: details.version,
        }),
      }
    );

    setSubmitting(false);

    if (!response.success || !response.data) {
      setError(
        response.error || "Unable to record your authorization. Please try again."
      );
      return;
    }

    setConfirmation(response.data);
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-[#65748a] shadow-sm">
        Loading guardian authorization request...
      </div>
    );
  }

  if (confirmation) {
    return (
      <div className="rounded-3xl border border-emerald-200 bg-white p-6 sm:p-8 shadow-[0_24px_60px_-28px_rgba(16,35,65,0.45)]">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" />
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-[#102341]">Authorization recorded</h2>
            <p className="text-sm leading-relaxed text-[#65748a]">
              Thank you. Your authorization has been recorded for this student-athlete.
              The account still requires school and platform verification before portal
              access is unlocked.
            </p>
            <SiteLink
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#102341] hover:underline"
            >
              Return to home
              <ArrowUpRight className="h-3.5 w-3.5" />
            </SiteLink>
          </div>
        </div>
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-6 sm:p-8">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-red-900">
              Guardian authorization unavailable
            </h2>
            <p className="text-sm leading-relaxed text-red-800">
              {error || "This link is no longer valid."}
            </p>
            <p className="text-xs leading-relaxed text-red-700">
              Contact mvp418.recruiting@gmail.com for a new authorization link.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-[0_24px_60px_-28px_rgba(16,35,65,0.45)]">
      <div className="border-b border-slate-100 bg-[#102341] px-6 py-6 sm:px-8">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#bed8ff]">
          <ShieldCheck className="h-3.5 w-3.5" />
          Guardian authorization
        </span>
        <h2 className="mt-3 text-xl font-bold text-white sm:text-2xl">
          Authorize this student-athlete registration
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-slate-300">
          This separate confirmation is required before the athlete can be verified.
        </p>
      </div>

      <div className="space-y-5 p-6 sm:p-8">
        <div className="rounded-xl border border-slate-200 bg-[#f8fafc] p-4 text-xs text-[#65748a] space-y-1.5">
          <div>
            Athlete:{" "}
            <span className="font-semibold text-[#102341]">
              {details.user.firstName} {details.user.lastName}
            </span>
          </div>
          <div>
            Athlete email: <span className="font-semibold">{details.user.email}</span>
          </div>
          {details.user.schoolId && (
            <div>
              School ID: <span className="font-semibold">{details.user.schoolId}</span>
            </div>
          )}
          <div>
            Guardian:{" "}
            <span className="font-semibold">
              {details.guardianName} ({details.guardianEmail})
            </span>
          </div>
          <div className="flex items-center gap-1.5 pt-1">
            <Clock className="h-3.5 w-3.5" />
            <span>
              Link expires:{" "}
              {new Date(details.expiresAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
        </div>

        <div className="text-xs leading-relaxed text-[#65748a] space-y-2">
          <p>
            By authorizing this registration, you confirm that you are the parent or
            legal guardian of this athlete and that you have reviewed the applicable
            policies.
          </p>
          <p>
            <SiteLink
              href="/terms"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-[#102341] hover:underline"
            >
              Terms of Use
            </SiteLink>
            {" · "}
            <SiteLink
              href="/privacy-policy"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-[#102341] hover:underline"
            >
              Privacy Policy
            </SiteLink>
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(event) => setAccepted(event.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#102341] focus:ring-[#102341] cursor-pointer"
          />
          <span className="text-xs leading-relaxed text-[#65748a]">
            I confirm I am the parent or legal guardian and authorize this athlete&apos;s
            participation on MVP 4.18.
          </span>
        </label>

        <button
          type="button"
          onClick={() => void handleConfirm()}
          disabled={!accepted || submitting}
          className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#102341] px-6 py-3.5 text-sm font-bold text-white transition-colors hover:bg-[#1d3d68] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Recording authorization..." : "Authorize registration"}
          {!submitting && <ArrowUpRight className="h-4 w-4 text-[#bed8ff]" />}
        </button>
      </div>
    </div>
  );
}
