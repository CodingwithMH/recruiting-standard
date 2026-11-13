"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  BadgeCheck,
  CheckCircle2,
  Clock,
  RefreshCw,
  ShieldCheck,
  ShieldX,
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import ReviewNotesForm from "@/components/admin/ReviewNotesForm";

type VerificationStatus = "UNVERIFIED" | "PENDING" | "APPROVED" | "REJECTED";

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

interface VerificationQueueAthlete {
  id: string;
  primarySport: string;
  sports: string[];
  graduationYear: number;
  completionPercentage: number;
  verificationStatus: VerificationStatus;
  verificationNotes: string | null;
  submittedAt: string | null;
  verifiedAt: string | null;
  updatedAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    status: string;
  };
  documents: {
    approved: number;
    pending: number;
    rejected: number;
  };
  verificationRequirements: VerificationRequirements;
}

interface VerificationQueueResponse {
  athletes: VerificationQueueAthlete[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const STATUS_STYLES: Record<VerificationStatus, string> = {
  UNVERIFIED: "bg-slate-100 text-slate-700 border-slate-200",
  PENDING: "bg-amber-50 text-amber-800 border-amber-200/80",
  APPROVED: "bg-emerald-50 text-emerald-800 border-emerald-200/80",
  REJECTED: "bg-red-50 text-red-800 border-red-200/80",
};

const STATUS_LABELS: Record<VerificationStatus, string> = {
  UNVERIFIED: "Unverified",
  PENDING: "Pending review",
  APPROVED: "Verified",
  REJECTED: "Rejected",
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  const parsed = new Date(value);
  return isNaN(parsed.getTime())
    ? "—"
    : parsed.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
}

function getApprovalBlockReason(
  athlete: VerificationQueueAthlete
): string | null {
  const requirements = athlete.verificationRequirements;

  if (!requirements.enrollmentProofApproved) {
    return requirements.enrollmentProofStatus === "PENDING"
      ? "Cannot approve: the required enrollment proof is still pending review."
      : requirements.enrollmentProofStatus === "REJECTED"
        ? "Cannot approve: the required enrollment proof was rejected. Wait for an approved replacement."
        : "Cannot approve: the athlete needs an approved enrollment letter or current report card.";
  }

  if (
    requirements.guardianConsentRequired &&
    !requirements.guardianConsentRecorded
  ) {
    return "Cannot approve: a linked parent or guardian must record consent for this athlete under 18.";
  }

  return null;
}

export default function AthleteVerificationQueue() {
  const [athletes, setAthletes] = useState<VerificationQueueAthlete[]>([]);
  const [statusFilter, setStatusFilter] = useState<
    VerificationStatus | "ALL"
  >("PENDING");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notesFor, setNotesFor] = useState<{
    id: string;
    intent: "APPROVE" | "REJECT";
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadAthletes = useCallback(async () => {
    setLoading(true);
    setError(null);

    const query =
      statusFilter === "ALL" ? "?limit=100" : `?status=${statusFilter}&limit=100`;

    const res = await apiRequest<VerificationQueueResponse>(
      `/admin/athlete-verifications${query}`
    );

    if (res.success && res.data) {
      setAthletes(res.data.athletes);
    } else {
      setAthletes([]);
      setError(res.error || "Unable to load the profile verification queue.");
    }

    setLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadAthletes();
  }, [loadAthletes]);

  const handleReview = async (
    athlete: VerificationQueueAthlete,
    status: "APPROVED" | "REJECTED",
    notes: string | null
  ) => {
    setBusyId(athlete.id);
    setError(null);
    setNotice(null);

    const res = await apiRequest(
      `/admin/athlete-verifications/${athlete.id}/review`,
      {
        method: "PATCH",
        body: JSON.stringify({
          status,
          notes: notes ?? undefined,
        }),
      }
    );

    setBusyId(null);

    if (res.success) {
      setNotesFor(null);
      setNotice(
        status === "APPROVED"
          ? `${athlete.user.firstName} ${athlete.user.lastName}'s profile has been verified.`
          : `${athlete.user.firstName} ${athlete.user.lastName}'s profile was rejected with reviewer notes.`
      );
      await loadAthletes();
    } else {
      setError(res.error || "Unable to update this athlete profile.");
    }
  };

  return (
    <section className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
      <div className="p-6 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <BadgeCheck className="w-4 h-4 text-blue-600" />
          <h2 className="text-base font-bold text-[#102341]">
            Athlete Profile Verification
          </h2>
          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 rounded-full px-2 py-0.5">
            {athletes.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value as VerificationStatus | "ALL"
              )
            }
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-[#102341] focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="PENDING">Pending review</option>
            <option value="APPROVED">Verified</option>
            <option value="REJECTED">Rejected</option>
            <option value="UNVERIFIED">Unverified</option>
            <option value="ALL">All profiles</option>
          </select>
          <button
            type="button"
            onClick={() => void loadAthletes()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-[#102341] text-[11px] font-bold disabled:opacity-60 cursor-pointer"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>
      </div>

      <div className="p-6 space-y-4">
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

        <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
          {loading && (
            <p className="px-4 py-10 text-center text-xs text-[#65748a]">
              Loading athlete profiles...
            </p>
          )}

          {!loading && athletes.length === 0 && (
            <p className="px-4 py-10 text-center text-xs text-[#65748a]">
              No athlete profiles in this queue.
            </p>
          )}

          {athletes.map((athlete) => (
            <div key={athlete.id} className="px-4 py-4 bg-white space-y-3">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="min-w-0 max-w-2xl space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-[#102341]">
                      {athlete.user.firstName} {athlete.user.lastName}
                    </span>
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLES[athlete.verificationStatus]}`}
                    >
                      {STATUS_LABELS[athlete.verificationStatus]}
                    </span>
                    {athlete.user.status !== "ACTIVE" && (
                      <span className="inline-flex px-2.5 py-1 rounded-full border border-red-200 bg-red-50 text-red-700 text-[10px] font-bold uppercase tracking-wider">
                        Account {athlete.user.status.toLowerCase()}
                      </span>
                    )}
                  </div>
                  <span className="block text-[11px] text-[#65748a]">
                    {athlete.user.email} · {athlete.primarySport} · Class of{" "}
                    {athlete.graduationYear}
                  </span>
                  <span className="block text-[11px] text-[#65748a]">
                    Submitted {formatDate(athlete.submittedAt)} · Documents (all
                    types):{" "}
                    <span className="text-emerald-700 font-semibold">
                      {athlete.documents.approved} approved
                    </span>
                    ,{" "}
                    <span className="text-amber-700 font-semibold">
                      {athlete.documents.pending} pending
                    </span>
                    ,{" "}
                    <span className="text-red-700 font-semibold">
                      {athlete.documents.rejected} rejected
                    </span>
                  </span>

                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    <span
                      className={`inline-flex px-2 py-1 rounded-full border text-[9px] font-bold ${
                        athlete.verificationRequirements
                          .enrollmentProofApproved
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : "border-amber-200 bg-amber-50 text-amber-900"
                      }`}
                    >
                      Enrollment proof:{" "}
                      {athlete.verificationRequirements.enrollmentProofStatus ===
                      "APPROVED"
                        ? "approved"
                        : athlete.verificationRequirements
                              .enrollmentProofStatus === "PENDING"
                          ? "pending"
                          : athlete.verificationRequirements
                                .enrollmentProofStatus === "REJECTED"
                            ? "rejected — replacement needed"
                            : "missing"}
                    </span>
                    <span
                      className={`inline-flex px-2 py-1 rounded-full border text-[9px] font-bold ${
                        !athlete.verificationRequirements
                          .guardianConsentRequired ||
                        athlete.verificationRequirements.guardianConsentRecorded
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : "border-amber-200 bg-amber-50 text-amber-900"
                      }`}
                    >
                      Guardian consent:{" "}
                      {!athlete.verificationRequirements.guardianConsentRequired
                        ? "not required (18+)"
                        : athlete.verificationRequirements
                              .guardianConsentRecorded
                          ? "recorded"
                          : "not recorded"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 w-48">
                    <div className="h-1.5 flex-1 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className="h-full bg-blue-600"
                        style={{ width: `${athlete.completionPercentage}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-[#102341] shrink-0">
                      {athlete.completionPercentage}%
                    </span>
                  </div>

                  {athlete.verificationNotes && (
                    <span className="block text-[10px] text-[#65748a]">
                      Notes: {athlete.verificationNotes}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap self-start lg:self-auto">
                  {athlete.verificationStatus === "PENDING" ? (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setNotesFor({ id: athlete.id, intent: "APPROVE" })
                        }
                        disabled={
                          busyId === athlete.id ||
                          getApprovalBlockReason(athlete) !== null
                        }
                        title={
                          getApprovalBlockReason(athlete) ??
                          "Approve this athlete profile"
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Approve verification
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setNotesFor({ id: athlete.id, intent: "REJECT" })
                        }
                        disabled={busyId === athlete.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-red-200 bg-red-50 hover:bg-red-100 text-red-800 text-[11px] font-bold disabled:opacity-60 cursor-pointer"
                      >
                        <ShieldX className="w-3.5 h-3.5" />
                        Reject
                      </button>
                    </>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-[#65748a]">
                      <Clock className="w-3.5 h-3.5" />
                      Awaiting athlete resubmission
                    </span>
                  )}
                </div>
              </div>

              {notesFor?.id === athlete.id && (
                <ReviewNotesForm
                  intent={notesFor.intent}
                  busy={busyId === athlete.id}
                  onConfirm={(notes) =>
                    void handleReview(
                      athlete,
                      notesFor.intent === "APPROVE" ? "APPROVED" : "REJECTED",
                      notes
                    )
                  }
                  onCancel={() => setNotesFor(null)}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
