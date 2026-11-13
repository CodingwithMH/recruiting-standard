"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  BadgeCheck,
  BarChart3,
  CheckCircle2,
  Circle,
  Clock,
  GraduationCap,
  Link2,
  Loader2,
  Plus,
  RefreshCw,
  Ruler,
  Save,
  Send,
  ShieldCheck,
  Target,
  Trash2,
  Trophy,
} from "lucide-react";
import { apiRequest } from "@/lib/api";

type VerificationStatus = "UNVERIFIED" | "PENDING" | "APPROVED" | "REJECTED";

interface CompletionItem {
  key: string;
  label: string;
  complete: boolean;
}

interface SportStatistic {
  label: string;
  value: string;
}

interface SerializedSport {
  sport: string;
  isPrimary: boolean;
  positions: string[];
  statistics: SportStatistic[];
}

type EnrollmentProofStatus =
  | "MISSING"
  | "PENDING"
  | "APPROVED"
  | "REJECTED";

type VerificationRequirement =
  | "ENROLLMENT_PROOF"
  | "GUARDIAN_CONSENT";

interface VerificationRequirements {
  isMinor: boolean;
  guardianConsentRequired: boolean;
  guardianConsentRecorded: boolean;
  enrollmentProofStatus: EnrollmentProofStatus;
  enrollmentProofApproved: boolean;
  eligibleForApproval: boolean;
  missingRequirements: VerificationRequirement[];
}

interface AthleteProfile {
  id: string;
  graduationYear: number;
  sports: SerializedSport[];
  heightInches: number | null;
  weightLbs: number | null;
  academic: {
    gpa: number | null;
    actScore: number | null;
    satScore: number | null;
    highSchoolName: string | null;
    city: string | null;
    state: string | null;
  };
  highlightLinks: string[];
  completionPercentage: number;
  completionChecklist?: CompletionItem[];
  verificationStatus: VerificationStatus;
  verificationNotes?: string | null;
  submittedAt?: string | null;
  verifiedAt?: string | null;
  updatedAt: string;
  verificationRequirements?: VerificationRequirements | null;
}

interface SportEntry {
  sport: string;
  positions: string;
  statistics: SportStatistic[];
  isPrimary: boolean;
}

interface ProfileForm {
  graduationYear: string;
  highSchoolName: string;
  city: string;
  state: string;
  gpa: string;
  actScore: string;
  satScore: string;
  heightInches: string;
  weightLbs: string;
  sports: SportEntry[];
  highlightLinks: string[];
}

const GRADUATION_YEARS = Array.from({ length: 17 }, (_, index) => 2024 + index);

const VERIFICATION_STYLES: Record<VerificationStatus, string> = {
  UNVERIFIED: "bg-slate-100 text-slate-700 border-slate-200",
  PENDING: "bg-amber-50 text-amber-800 border-amber-200/80",
  APPROVED: "bg-emerald-50 text-emerald-800 border-emerald-200/80",
  REJECTED: "bg-red-50 text-red-800 border-red-200/80",
};

const VERIFICATION_LABELS: Record<VerificationStatus, string> = {
  UNVERIFIED: "Unverified",
  PENDING: "Verification pending",
  APPROVED: "Verified",
  REJECTED: "Verification rejected",
};

const VERIFICATION_PANEL_STYLES: Record<VerificationStatus, string> = {
  UNVERIFIED:
    "border-slate-200 bg-slate-50/60 text-[#102341]",
  PENDING: "border-amber-200 bg-amber-50 text-amber-900",
  APPROVED: "border-emerald-200 bg-emerald-50 text-emerald-900",
  REJECTED: "border-red-200 bg-red-50 text-red-800",
};

const MIN_COMPLETION_TO_SUBMIT = 80;

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  return isNaN(parsed.getTime())
    ? null
    : parsed.toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
}

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-[#102341] outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100";
const labelClass =
  "block text-[10px] font-bold uppercase tracking-wider text-[#65748a] mb-1.5";

function createEmptySport(isPrimary = false): SportEntry {
  return {
    sport: "",
    positions: "",
    statistics: [{ label: "", value: "" }],
    isPrimary,
  };
}

function createEmptyForm(): ProfileForm {
  return {
    graduationYear: "",
    highSchoolName: "",
    city: "",
    state: "",
    gpa: "",
    actScore: "",
    satScore: "",
    heightInches: "",
    weightLbs: "",
    sports: [createEmptySport(true)],
    highlightLinks: [""],
  };
}

function numberToString(value: number | null): string {
  return value === null ? "" : String(value);
}

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function toForm(profile: AthleteProfile): ProfileForm {
  const sports = profile.sports.length
    ? profile.sports.map((sport) => ({
        sport: sport.sport,
        positions: sport.positions.join(", "),
        statistics: sport.statistics.length
          ? sport.statistics.map((stat) => ({ ...stat }))
          : [{ label: "", value: "" }],
        isPrimary: sport.isPrimary,
      }))
    : [createEmptySport(true)];

  return {
    graduationYear: String(profile.graduationYear),
    highSchoolName: profile.academic.highSchoolName ?? "",
    city: profile.academic.city ?? "",
    state: profile.academic.state ?? "",
    gpa: numberToString(profile.academic.gpa),
    actScore: numberToString(profile.academic.actScore),
    satScore: numberToString(profile.academic.satScore),
    heightInches: numberToString(profile.heightInches),
    weightLbs: numberToString(profile.weightLbs),
    sports,
    highlightLinks: profile.highlightLinks.length
      ? [...profile.highlightLinks]
      : [""],
  };
}

function toOptionalNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function toOptionalString(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export default function AthleteProfileBuilder() {
  const [form, setForm] = useState<ProfileForm>(createEmptyForm);
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [completionChecklist, setCompletionChecklist] = useState<
    CompletionItem[]
  >([]);
  const [verificationStatus, setVerificationStatus] =
    useState<VerificationStatus>("UNVERIFIED");
  const [verificationNotes, setVerificationNotes] = useState<string | null>(
    null
  );
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [verifiedAt, setVerifiedAt] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [verificationRequirements, setVerificationRequirements] =
    useState<VerificationRequirements | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const applyProfile = useCallback((profile: AthleteProfile) => {
    setForm(toForm(profile));
    setCompletionPercentage(profile.completionPercentage);
    setCompletionChecklist(profile.completionChecklist ?? []);
    setVerificationStatus(profile.verificationStatus);
    setVerificationNotes(profile.verificationNotes ?? null);
    setSubmittedAt(profile.submittedAt ?? null);
    setVerifiedAt(profile.verifiedAt ?? null);
    setUpdatedAt(profile.updatedAt);
    setVerificationRequirements(profile.verificationRequirements ?? null);
  }, []);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);

    const res = await apiRequest<AthleteProfile | null>("/athlete/profile");

    if (res.success) {
      if (res.data) {
        applyProfile(res.data);
      }
    } else {
      setError(res.error || "Unable to load your athlete profile.");
    }

    setLoading(false);
  }, [applyProfile]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadProfile();
  }, [loadProfile]);

  const updateSport = (index: number, patch: Partial<SportEntry>) => {
    setForm((prev) => ({
      ...prev,
      sports: prev.sports.map((sport, sportIndex) =>
        sportIndex === index ? { ...sport, ...patch } : sport
      ),
    }));
  };

  const setPrimarySport = (index: number) => {
    setForm((prev) => ({
      ...prev,
      sports: prev.sports.map((sport, sportIndex) => ({
        ...sport,
        isPrimary: sportIndex === index,
      })),
    }));
  };

  const addSport = () => {
    setForm((prev) => {
      if (prev.sports.length >= 10) return prev;
      return {
        ...prev,
        sports: [...prev.sports, createEmptySport(false)],
      };
    });
  };

  const removeSport = (index: number) => {
    setForm((prev) => {
      if (prev.sports.length <= 1) return prev;
      const next = prev.sports.filter((_, sportIndex) => sportIndex !== index);
      if (!next.some((sport) => sport.isPrimary)) {
        next[0] = { ...next[0], isPrimary: true };
      }
      return { ...prev, sports: next };
    });
  };

  const updateStatistic = (
    sportIndex: number,
    statIndex: number,
    patch: Partial<SportStatistic>
  ) => {
    setForm((prev) => ({
      ...prev,
      sports: prev.sports.map((sport, index) => {
        if (index !== sportIndex) return sport;
        return {
          ...sport,
          statistics: sport.statistics.map((stat, currentStatIndex) =>
            currentStatIndex === statIndex ? { ...stat, ...patch } : stat
          ),
        };
      }),
    }));
  };

  const addStatistic = (sportIndex: number) => {
    setForm((prev) => ({
      ...prev,
      sports: prev.sports.map((sport, index) => {
        if (index !== sportIndex || sport.statistics.length >= 20) return sport;
        return {
          ...sport,
          statistics: [...sport.statistics, { label: "", value: "" }],
        };
      }),
    }));
  };

  const removeStatistic = (sportIndex: number, statIndex: number) => {
    setForm((prev) => ({
      ...prev,
      sports: prev.sports.map((sport, index) => {
        if (index !== sportIndex) return sport;
        const statistics = sport.statistics.filter(
          (_, currentStatIndex) => currentStatIndex !== statIndex
        );
        return {
          ...sport,
          statistics: statistics.length
            ? statistics
            : [{ label: "", value: "" }],
        };
      }),
    }));
  };

  const updateHighlightLink = (index: number, value: string) => {
    setForm((prev) => ({
      ...prev,
      highlightLinks: prev.highlightLinks.map((link, linkIndex) =>
        linkIndex === index ? value : link
      ),
    }));
  };

  const addHighlightLink = () => {
    setForm((prev) => {
      if (prev.highlightLinks.length >= 10) return prev;
      return {
        ...prev,
        highlightLinks: [...prev.highlightLinks, ""],
      };
    });
  };

  const removeHighlightLink = (index: number) => {
    setForm((prev) => {
      const highlightLinks = prev.highlightLinks.filter(
        (_, linkIndex) => linkIndex !== index
      );
      return {
        ...prev,
        highlightLinks: highlightLinks.length ? highlightLinks : [""],
      };
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setNotice(null);

    const graduationYear = Number(form.graduationYear);
    if (
      !Number.isInteger(graduationYear) ||
      graduationYear < 2020 ||
      graduationYear > 2040
    ) {
      setError("Select a valid expected graduation year between 2020 and 2040.");
      return;
    }

    const sports = form.sports
      .map((sport) => ({
        sport: sport.sport.trim(),
        isPrimary: sport.isPrimary,
        positions: splitList(sport.positions),
        statistics: sport.statistics
          .map((stat) => ({
            label: stat.label.trim(),
            value: stat.value.trim(),
          }))
          .filter((stat) => stat.label && stat.value),
      }))
      .filter((sport) => sport.sport.length > 0);

    if (sports.length === 0) {
      setError("Add at least one sport to build your profile.");
      return;
    }

    if (!sports.some((sport) => sport.isPrimary)) {
      sports[0].isPrimary = true;
    }

    const highlightLinks = form.highlightLinks
      .map((link) => link.trim())
      .filter(Boolean);

    const priorVerificationStatus = verificationStatus;

    setSaving(true);

    const res = await apiRequest<AthleteProfile>("/athlete/profile", {
      method: "PUT",
      body: JSON.stringify({
        graduationYear,
        sports,
        heightInches: toOptionalNumber(form.heightInches),
        weightLbs: toOptionalNumber(form.weightLbs),
        academic: {
          gpa: toOptionalNumber(form.gpa),
          actScore: toOptionalNumber(form.actScore),
          satScore: toOptionalNumber(form.satScore),
          highSchoolName: toOptionalString(form.highSchoolName),
          city: toOptionalString(form.city),
          state: toOptionalString(form.state),
        },
        highlightLinks,
      }),
    });

    setSaving(false);

    if (res.success && res.data) {
      applyProfile(res.data);
      setNotice(
        priorVerificationStatus === "APPROVED" ||
          priorVerificationStatus === "REJECTED"
          ? "Athlete profile saved. Because your profile changed, submit it again for verification."
          : "Athlete profile saved. Your profile is now visible to coaches."
      );
    } else {
      setError(res.error || "Unable to save your athlete profile.");
    }
  };

  const handleSubmitForVerification = async () => {
    setSubmitting(true);
    setError(null);
    setNotice(null);

    const res = await apiRequest<AthleteProfile>("/athlete/profile/submit", {
      method: "POST",
    });

    setSubmitting(false);

    if (res.success && res.data) {
      applyProfile(res.data);
      setNotice(
        "Profile submitted for verification. Our review team will approve or reject it, and the result will appear here."
      );
    } else {
      setError(
        res.error || "Unable to submit your profile for verification."
      );
    }
  };

  const enrollmentProofStatus =
    verificationRequirements?.enrollmentProofStatus ?? null;
  const enrollmentProofBlocksSubmission =
    enrollmentProofStatus === "MISSING" || enrollmentProofStatus === "REJECTED";

  return (
    <section className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
      <div className="p-6 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-blue-600" />
          <h2 className="text-base font-bold text-[#102341]">
            Multi-Sport Athlete Profile
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${VERIFICATION_STYLES[verificationStatus]}`}
          >
            {VERIFICATION_LABELS[verificationStatus]}
          </span>
          <button
            type="button"
            onClick={() => void loadProfile()}
            disabled={loading || saving}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-[#102341] text-[11px] font-bold disabled:opacity-60 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      <form onSubmit={(event) => void handleSubmit(event)} className="p-6 space-y-8">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        {notice && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{notice}</span>
          </div>
        )}

        {loading ? (
          <div className="py-10 text-center text-xs text-[#65748a]">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin mx-auto mb-2" />
            Loading your athlete profile...
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3 text-[11px] font-bold text-[#102341]">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                  Profile completion
                </span>
                <span>{completionPercentage}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
              <p className="text-[10px] text-[#65748a]">
                {updatedAt
                  ? `Last updated ${new Date(updatedAt).toLocaleDateString()}`
                  : "Complete your profile to appear in coach searches."}
              </p>

              {completionChecklist.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 pt-1 border-t border-slate-200/70">
                  {completionChecklist.map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center gap-1.5 text-[11px]"
                    >
                      {item.complete ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <Circle className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                      )}
                      <span
                        className={
                          item.complete
                            ? "font-semibold text-[#102341]"
                            : "text-[#65748a]"
                        }
                      >
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div
              className={`rounded-xl border p-4 space-y-3 ${VERIFICATION_PANEL_STYLES[verificationStatus]}`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-[11px] font-bold">
                  {verificationStatus === "APPROVED" ? (
                    <BadgeCheck className="w-4 h-4" />
                  ) : verificationStatus === "PENDING" ? (
                    <Clock className="w-4 h-4" />
                  ) : verificationStatus === "REJECTED" ? (
                    <AlertCircle className="w-4 h-4" />
                  ) : (
                    <ShieldCheck className="w-4 h-4" />
                  )}
                  <span>
                    {VERIFICATION_LABELS[verificationStatus]}
                    {verificationStatus === "PENDING" &&
                      formatDate(submittedAt) &&
                      ` · submitted ${formatDate(submittedAt)}`}
                    {verificationStatus === "APPROVED" &&
                      formatDate(verifiedAt) &&
                      ` · verified ${formatDate(verifiedAt)}`}
                  </span>
                </div>

                {verificationStatus === "UNVERIFIED" && (
                  <button
                    type="button"
                    onClick={() => void handleSubmitForVerification()}
                    disabled={
                      submitting ||
                      completionPercentage < MIN_COMPLETION_TO_SUBMIT ||
                      enrollmentProofBlocksSubmission
                    }
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-[#102341] hover:bg-[#1b355c] text-white text-[11px] font-bold disabled:opacity-60 cursor-pointer shrink-0"
                  >
                    {submitting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    {submitting
                      ? "Submitting..."
                      : "Submit for verification"}
                  </button>
                )}
              </div>

              {verificationRequirements && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
                  <div
                    className={`rounded-lg border px-3 py-2 ${
                      verificationRequirements.enrollmentProofApproved
                        ? "border-emerald-200 bg-white/70 text-emerald-800"
                        : "border-amber-200 bg-white/70 text-amber-900"
                    }`}
                  >
                    <span className="block font-bold">
                      Current enrollment proof
                    </span>
                    <span className="block mt-0.5">
                      {verificationRequirements.enrollmentProofStatus ===
                      "APPROVED"
                        ? "Approved"
                        : verificationRequirements.enrollmentProofStatus ===
                            "PENDING"
                          ? "Pending review"
                          : verificationRequirements.enrollmentProofStatus ===
                              "REJECTED"
                            ? "Rejected — upload a replacement in Private documents"
                            : "Not uploaded — upload an enrollment letter or report card"}
                    </span>
                  </div>
                  <div
                    className={`rounded-lg border px-3 py-2 ${
                      !verificationRequirements.guardianConsentRequired ||
                      verificationRequirements.guardianConsentRecorded
                        ? "border-emerald-200 bg-white/70 text-emerald-800"
                        : "border-amber-200 bg-white/70 text-amber-900"
                    }`}
                  >
                    <span className="block font-bold">Parent/guardian consent</span>
                    <span className="block mt-0.5">
                      {!verificationRequirements.guardianConsentRequired
                        ? "Not required for this athlete"
                        : verificationRequirements.guardianConsentRecorded
                          ? "Recorded"
                          : "Required — a linked parent or guardian must record consent"}
                    </span>
                  </div>
                </div>
              )}

              {verificationStatus === "UNVERIFIED" && (
                <div className="space-y-2">
                  <p className="text-[10px] leading-relaxed opacity-80">
                    {completionPercentage < MIN_COMPLETION_TO_SUBMIT
                      ? `Reach ${MIN_COMPLETION_TO_SUBMIT}% completion to submit your profile for verification (currently ${completionPercentage}%). Complete the missing checklist items above.`
                      : enrollmentProofBlocksSubmission
                        ? "Upload an enrollment letter or current report card in Private documents before submitting. The Verified badge is based on current school enrollment only; it does not confirm athletic eligibility or transfer approval."
                        : verificationRequirements?.guardianConsentRequired &&
                            !verificationRequirements.guardianConsentRecorded
                          ? "Your profile is ready to submit. Because you are under 18, a linked parent or guardian must record consent before an admin can approve verification."
                          : "Submitting sends your profile to our review team. Verified athletes appear first in coach searches and can share approved documents with subscribed schools."}
                  </p>
                  {verificationNotes && (
                    <div className="rounded-lg border border-slate-200 bg-white/70 px-3 py-2">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-700">
                        Verification update
                      </span>
                      <span className="block text-[11px] text-slate-800 mt-0.5 whitespace-pre-line">
                        {verificationNotes}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {verificationStatus === "PENDING" && (
                <p className="text-[10px] leading-relaxed opacity-80">
                  Our review team is checking your profile. You can keep
                  editing it; reviewers always see your latest saved
                  information. The decision will appear here.
                </p>
              )}

              {verificationStatus === "APPROVED" && (
                <div className="space-y-2">
                  <p className="text-[10px] leading-relaxed opacity-80">
                    Verified profiles appear first in coach searches and unlock
                    document access for subscribed school coaches. The badge
                    confirms current school enrollment only, not athletic
                    eligibility or transfer approval. Saving changes or losing an
                    approved enrollment proof or required guardian consent can
                    reset verification and require a new review.
                  </p>
                  {verificationNotes && (
                    <div className="rounded-lg border border-emerald-200 bg-white/70 px-3 py-2">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                        Reviewer notes
                      </span>
                      <span className="block text-[11px] text-emerald-800 mt-0.5 whitespace-pre-line">
                        {verificationNotes}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {verificationStatus === "REJECTED" && (
                <div className="space-y-2">
                  <p className="text-[10px] leading-relaxed opacity-80">
                    Address the reviewer feedback and any rejected required
                    enrollment proof in Private documents, then resubmit for
                    verification. Rejected optional documents do not block
                    verification.
                  </p>
                  {verificationNotes && (
                    <div className="rounded-lg border border-red-200 bg-white/70 px-3 py-2">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-red-700">
                        Reviewer feedback
                      </span>
                      <span className="block text-[11px] text-red-800 mt-0.5 whitespace-pre-line">
                        {verificationNotes}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-[#102341]">
                  Recruiting Class & Academic Information
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className={labelClass} htmlFor="graduationYear">
                    Expected graduation year (recruiting class) *
                  </label>
                  <select
                    id="graduationYear"
                    value={form.graduationYear}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        graduationYear: event.target.value,
                      }))
                    }
                    required
                    className={inputClass}
                  >
                    <option value="">Select year</option>
                    {GRADUATION_YEARS.map((year) => (
                      <option key={year} value={year}>
                        Class of {year}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass} htmlFor="highSchoolName">
                    High school
                  </label>
                  <input
                    id="highSchoolName"
                    type="text"
                    maxLength={150}
                    value={form.highSchoolName}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        highSchoolName: event.target.value,
                      }))
                    }
                    placeholder="Northside Preparatory"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass} htmlFor="state">
                    State / Region
                  </label>
                  <input
                    id="state"
                    type="text"
                    maxLength={100}
                    value={form.state}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        state: event.target.value,
                      }))
                    }
                    placeholder="TX"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass} htmlFor="city">
                    City
                  </label>
                  <input
                    id="city"
                    type="text"
                    maxLength={100}
                    value={form.city}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        city: event.target.value,
                      }))
                    }
                    placeholder="Austin"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass} htmlFor="gpa">
                    GPA (0.0 - 4.0)
                  </label>
                  <input
                    id="gpa"
                    type="text"
                    inputMode="decimal"
                    value={form.gpa}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        gpa: event.target.value,
                      }))
                    }
                    placeholder="3.75"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass} htmlFor="actScore">
                    ACT score
                  </label>
                  <input
                    id="actScore"
                    type="text"
                    inputMode="numeric"
                    value={form.actScore}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        actScore: event.target.value,
                      }))
                    }
                    placeholder="28"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass} htmlFor="satScore">
                    SAT score
                  </label>
                  <input
                    id="satScore"
                    type="text"
                    inputMode="numeric"
                    value={form.satScore}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        satScore: event.target.value,
                      }))
                    }
                    placeholder="1280"
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-[#102341]">
                    Sports, Positions & Events
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={addSport}
                  disabled={form.sports.length >= 10}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-900 text-[11px] font-bold disabled:opacity-50 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add sport
                </button>
              </div>

              <div className="space-y-4">
                {form.sports.map((sport, sportIndex) => (
                  <div
                    key={sportIndex}
                    className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 space-y-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#102341]">
                        <Target className="w-3.5 h-3.5 text-blue-600" />
                        Sport {sportIndex + 1}
                      </span>
                      {form.sports.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeSport(sportIndex)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-red-200 bg-red-50 hover:bg-red-100 text-red-800 text-[10px] font-bold cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>Sport *</label>
                        <input
                          type="text"
                          maxLength={100}
                          value={sport.sport}
                          onChange={(event) =>
                            updateSport(sportIndex, {
                              sport: event.target.value,
                            })
                          }
                          placeholder="Basketball"
                          className={inputClass}
                        />
                      </div>

                      <label className="flex items-center gap-2 self-end rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 cursor-pointer">
                        <input
                          type="radio"
                          name="primarySport"
                          checked={sport.isPrimary}
                          onChange={() => setPrimarySport(sportIndex)}
                          className="accent-blue-600"
                        />
                        <span className="text-xs font-semibold text-[#102341]">
                          Primary sport
                        </span>
                      </label>
                    </div>

                    <div>
                      <label className={labelClass}>Positions / events</label>
                      <input
                        type="text"
                        value={sport.positions}
                        onChange={(event) =>
                          updateSport(sportIndex, {
                            positions: event.target.value,
                          })
                        }
                        placeholder="Point Guard, Shooting Guard"
                        className={inputClass}
                      />
                      <p className="mt-1 text-[10px] text-[#65748a]">
                        Separate multiple positions or events with commas.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <span className={`${labelClass} mb-0`}>
                          Statistics
                        </span>
                        <button
                          type="button"
                          onClick={() => addStatistic(sportIndex)}
                          disabled={sport.statistics.length >= 20}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-[#102341] text-[10px] font-bold disabled:opacity-50 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          Add stat
                        </button>
                      </div>

                      {sport.statistics.map((stat, statIndex) => (
                        <div
                          key={statIndex}
                          className="flex flex-col sm:flex-row gap-2"
                        >
                          <input
                            type="text"
                            maxLength={80}
                            value={stat.label}
                            onChange={(event) =>
                              updateStatistic(sportIndex, statIndex, {
                                label: event.target.value,
                              })
                            }
                            placeholder="Stat (e.g. PPG)"
                            className={inputClass}
                          />
                          <input
                            type="text"
                            maxLength={80}
                            value={stat.value}
                            onChange={(event) =>
                              updateStatistic(sportIndex, statIndex, {
                                value: event.target.value,
                              })
                            }
                            placeholder="Value (e.g. 18.4)"
                            className={inputClass}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              removeStatistic(sportIndex, statIndex)
                            }
                            aria-label="Remove statistic"
                            className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-xl border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Ruler className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-[#102341]">
                  Physical Metrics
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass} htmlFor="heightInches">
                    Height (inches)
                  </label>
                  <input
                    id="heightInches"
                    type="text"
                    inputMode="numeric"
                    value={form.heightInches}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        heightInches: event.target.value,
                      }))
                    }
                    placeholder="72"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="weightLbs">
                    Weight (lbs)
                  </label>
                  <input
                    id="weightLbs"
                    type="text"
                    inputMode="numeric"
                    value={form.weightLbs}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        weightLbs: event.target.value,
                      }))
                    }
                    placeholder="175"
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-[#102341]">
                    Highlight Links
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={addHighlightLink}
                  disabled={form.highlightLinks.length >= 10}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-900 text-[11px] font-bold disabled:opacity-50 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add link
                </button>
              </div>

              <div className="space-y-2">
                {form.highlightLinks.map((link, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="url"
                      value={link}
                      onChange={(event) =>
                        updateHighlightLink(index, event.target.value)
                      }
                      placeholder="https://www.hudl.com/video/..."
                      className={inputClass}
                    />
                    <button
                      type="button"
                      onClick={() => removeHighlightLink(index)}
                      aria-label="Remove highlight link"
                      className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-xl border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-[#65748a]">
                Add Hudl, YouTube, Vimeo, or other public highlight URLs.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-slate-100 pt-5">
              <div className="flex items-center gap-2 text-[11px] text-[#65748a]">
                <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
                <span>
                  Statistics and academics are shared with verified school coaches.
                </span>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full bg-[#102341] hover:bg-[#1b355c] text-white text-xs font-bold disabled:opacity-60 cursor-pointer"
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                {saving ? "Saving profile..." : "Save profile"}
              </button>
            </div>
          </>
        )}
      </form>
    </section>
  );
}
