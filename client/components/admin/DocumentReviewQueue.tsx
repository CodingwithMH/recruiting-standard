"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  FileCheck,
  RefreshCw,
  ShieldX,
} from "lucide-react";
import { apiRequest, openDocumentPreview } from "@/lib/api";
import ReviewNotesForm from "@/components/admin/ReviewNotesForm";

type DocumentType =
  | "TRANSCRIPT"
  | "ELIGIBILITY"
  | "COMBINE_REPORT"
  | "PHYSICAL"
  | "OTHER";

type DocumentStatus = "PENDING" | "APPROVED" | "REJECTED";

type ProfileVerificationStatus =
  | "UNVERIFIED"
  | "PENDING"
  | "APPROVED"
  | "REJECTED";

interface ReviewDocument {
  id: string;
  title: string;
  type: DocumentType;
  status: DocumentStatus;
  fileSizeBytes: number;
  mimeType: string;
  reviewerNotes: string | null;
  reviewedAt: string | null;
  createdAt: string;
  reviewer?: {
    firstName: string;
    lastName: string;
  } | null;
  athleteProfile: {
    id: string;
    primarySport: string;
    graduationYear: number;
    verificationStatus: ProfileVerificationStatus;
    user: {
      firstName: string;
      lastName: string;
      email: string;
    };
  };
}

interface ReviewQueueResponse {
  documents: ReviewDocument[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface DocumentAccess {
  downloadUrl: string;
}

const TYPE_LABELS: Record<DocumentType, string> = {
  TRANSCRIPT: "Transcript",
  ELIGIBILITY: "Eligibility",
  COMBINE_REPORT: "Combine report",
  PHYSICAL: "Physical",
  OTHER: "Other",
};

const STATUS_STYLES: Record<DocumentStatus, string> = {
  PENDING: "bg-amber-50 text-amber-800 border-amber-200/80",
  APPROVED: "bg-emerald-50 text-emerald-800 border-emerald-200/80",
  REJECTED: "bg-red-50 text-red-800 border-red-200/80",
};

const VERIFICATION_STYLES: Record<ProfileVerificationStatus, string> = {
  UNVERIFIED: "bg-slate-100 text-slate-700 border-slate-200",
  PENDING: "bg-amber-50 text-amber-800 border-amber-200/80",
  APPROVED: "bg-emerald-50 text-emerald-800 border-emerald-200/80",
  REJECTED: "bg-red-50 text-red-800 border-red-200/80",
};

const VERIFICATION_LABELS: Record<ProfileVerificationStatus, string> = {
  UNVERIFIED: "Profile unverified",
  PENDING: "Profile pending",
  APPROVED: "Profile verified",
  REJECTED: "Profile rejected",
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

function formatBytes(bytes: number): string {
  if (!bytes) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

export default function DocumentReviewQueue() {
  const [documents, setDocuments] = useState<ReviewDocument[]>([]);
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | "ALL">(
    "PENDING"
  );
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notesFor, setNotesFor] = useState<{
    id: string;
    intent: "APPROVE" | "REJECT";
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);

    const query =
      statusFilter === "ALL" ? "" : `?status=${statusFilter}&limit=100`;

    const res = await apiRequest<ReviewQueueResponse>(
      `/admin/documents${query}`
    );

    if (res.success && res.data) {
      setDocuments(res.data.documents);
    } else {
      setDocuments([]);
      setError(res.error || "Unable to load the document review queue.");
    }

    setLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadDocuments();
  }, [loadDocuments]);

  const handleView = async (document: ReviewDocument) => {
    setBusyId(document.id);
    setError(null);

    // Open a blank tab synchronously during the click event to avoid browser popup blockers.
    // Modern browsers block window.open if called after an asynchronous await.
    const previewWindow = window.open("about:blank", "_blank");

    const result = await openDocumentPreview(document.id, previewWindow);
    if (!result.success && result.error) {
      setError(result.error);
    }

    setBusyId(null);
  };

  const handleReview = async (
    document: ReviewDocument,
    status: "APPROVED" | "REJECTED",
    notes: string | null
  ) => {
    setBusyId(document.id);
    setError(null);
    setNotice(null);

    const res = await apiRequest(`/admin/documents/${document.id}/review`, {
      method: "PATCH",
      body: JSON.stringify({
        status,
        reviewerNotes: notes ?? undefined,
      }),
    });

    setBusyId(null);

    if (res.success) {
      setNotesFor(null);
      setNotice(
        status === "APPROVED" ? "Document approved." : "Document rejected."
      );
      await loadDocuments();
    } else {
      setError(res.error || "Unable to update this document.");
    }
  };

  return (
    <section className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
      <div className="p-6 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <FileCheck className="w-4 h-4 text-blue-600" />
          <h2 className="text-base font-bold text-[#102341]">
            Athlete Document Review
          </h2>
          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 rounded-full px-2 py-0.5">
            {documents.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as DocumentStatus | "ALL")
            }
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-[#102341] focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="ALL">All documents</option>
          </select>
          <button
            type="button"
            onClick={() => void loadDocuments()}
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
              Loading documents...
            </p>
          )}

          {!loading && documents.length === 0 && (
            <p className="px-4 py-10 text-center text-xs text-[#65748a]">
              No documents in this queue.
            </p>
          )}

          {documents.map((document) => (
            <div key={document.id} className="px-4 py-4 bg-white space-y-3">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="min-w-0 max-w-2xl">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="block font-bold text-[#102341] truncate">
                      {document.title}
                    </span>
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider ${VERIFICATION_STYLES[document.athleteProfile.verificationStatus]}`}
                    >
                      {VERIFICATION_LABELS[document.athleteProfile.verificationStatus]}
                    </span>
                  </div>
                  <span className="block text-[11px] text-[#65748a]">
                    {document.athleteProfile.user.firstName}{" "}
                    {document.athleteProfile.user.lastName} ·{" "}
                    {document.athleteProfile.user.email}
                  </span>
                  <span className="block text-[11px] text-[#65748a]">
                    {TYPE_LABELS[document.type]} ·{" "}
                    {formatBytes(document.fileSizeBytes)} ·{" "}
                    {document.athleteProfile.primarySport} · Class of{" "}
                    {document.athleteProfile.graduationYear}
                  </span>
                  {document.reviewer && document.reviewedAt && (
                    <span className="block text-[10px] text-slate-400">
                      Reviewed by {document.reviewer.firstName}{" "}
                      {document.reviewer.lastName} ·{" "}
                      {formatDate(document.reviewedAt)}
                    </span>
                  )}
                  {document.reviewerNotes && (
                    <span className="block text-[10px] text-[#65748a] mt-1">
                      Notes: {document.reviewerNotes}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap self-start lg:self-auto">
                  <span
                    className={`inline-flex px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLES[document.status]}`}
                  >
                    {document.status}
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleView(document)}
                    disabled={busyId === document.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-[#102341] text-[11px] font-bold disabled:opacity-60 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    View
                  </button>
                  {document.status !== "APPROVED" && (
                    <button
                      type="button"
                      onClick={() =>
                        setNotesFor({ id: document.id, intent: "APPROVE" })
                      }
                      disabled={busyId === document.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold disabled:opacity-60 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Approve
                    </button>
                  )}
                  {document.status !== "REJECTED" && (
                    <button
                      type="button"
                      onClick={() =>
                        setNotesFor({ id: document.id, intent: "REJECT" })
                      }
                      disabled={busyId === document.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-red-200 bg-red-50 hover:bg-red-100 text-red-800 text-[11px] font-bold disabled:opacity-60 cursor-pointer"
                    >
                      <ShieldX className="w-3.5 h-3.5" />
                      Reject
                    </button>
                  )}
                </div>
              </div>

              {notesFor?.id === document.id && (
                <ReviewNotesForm
                  intent={notesFor.intent}
                  busy={busyId === document.id}
                  onConfirm={(notes) =>
                    void handleReview(
                      document,
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
