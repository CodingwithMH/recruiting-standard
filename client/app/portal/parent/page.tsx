"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Eye,
  FileText,
  Loader2,
  RefreshCw,
  ShieldCheck,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import type { UserProfile } from "@/lib/api";
import { getStoredUser } from "@/lib/auth";

type LinkStatus = "PENDING" | "ACTIVE" | "REJECTED" | "REVOKED";

type ProfileVerificationStatus =
  | "UNVERIFIED"
  | "PENDING"
  | "APPROVED"
  | "REJECTED";

type DocumentType =
  | "TRANSCRIPT"
  | "ELIGIBILITY"
  | "COMBINE_REPORT"
  | "PHYSICAL"
  | "OTHER";

type DocumentStatus = "PENDING" | "APPROVED" | "REJECTED";

interface GuardianDocument {
  id: string;
  type: DocumentType;
  title: string;
  status: DocumentStatus;
  fileSizeBytes: number;
  reviewerNotes: string | null;
  createdAt: string;
}

interface GuardianLink {
  id: string;
  status: LinkStatus;
  respondedAt: string | null;
  createdAt: string;
  athlete: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    status: string;
    athleteProfile?: {
      primarySport: string;
      graduationYear: number;
      completionPercentage: number;
      verificationStatus: ProfileVerificationStatus;
      verifiedAt: string | null;
    } | null;
  };
}

interface DocumentAccess {
  downloadUrl: string;
}

const STATUS_STYLES: Record<LinkStatus, string> = {
  PENDING: "bg-amber-50 text-amber-800 border-amber-200/80",
  ACTIVE: "bg-emerald-50 text-emerald-800 border-emerald-200/80",
  REJECTED: "bg-red-50 text-red-800 border-red-200/80",
  REVOKED: "bg-slate-100 text-slate-700 border-slate-200",
};

const VERIFICATION_STYLES: Record<ProfileVerificationStatus, string> = {
  UNVERIFIED: "bg-slate-100 text-slate-700 border-slate-200",
  PENDING: "bg-amber-50 text-amber-800 border-amber-200/80",
  APPROVED: "bg-emerald-50 text-emerald-800 border-emerald-200/80",
  REJECTED: "bg-red-50 text-red-800 border-red-200/80",
};

const VERIFICATION_LABELS: Record<ProfileVerificationStatus, string> = {
  UNVERIFIED: "Unverified",
  PENDING: "Verification pending",
  APPROVED: "Verified",
  REJECTED: "Verification rejected",
};

const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  TRANSCRIPT: "Transcript",
  ELIGIBILITY: "Eligibility",
  COMBINE_REPORT: "Combine report",
  PHYSICAL: "Physical",
  OTHER: "Other",
};

const DOCUMENT_STATUS_STYLES: Record<DocumentStatus, string> = {
  PENDING: "bg-amber-50 text-amber-800 border-amber-200/80",
  APPROVED: "bg-emerald-50 text-emerald-800 border-emerald-200/80",
  REJECTED: "bg-red-50 text-red-800 border-red-200/80",
};

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

export default function ParentPortalPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [links, setLinks] = useState<GuardianLink[]>([]);
  const [athleteEmail, setAthleteEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expandedLinkId, setExpandedLinkId] = useState<string | null>(null);
  const [documentsByLink, setDocumentsByLink] = useState<
    Record<string, GuardianDocument[]>
  >({});
  const [loadingDocsLinkId, setLoadingDocsLinkId] = useState<string | null>(
    null
  );
  const [busyDocId, setBusyDocId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadLinks = useCallback(async () => {
    setLoading(true);
    setError(null);

    const res = await apiRequest<GuardianLink[]>("/parent/links");

    if (res.success && res.data) {
      setLinks(res.data);
    } else {
      setLinks([]);
      setError(res.error || "Unable to load your linked athletes.");
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser(getStoredUser());
    void loadLinks();
  }, [loadLinks]);

  const activeLinks = links.filter((link) => link.status === "ACTIVE");
  const otherLinks = links.filter((link) => link.status !== "ACTIVE");

  const handleRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setNotice(null);

    const res = await apiRequest("/parent/links", {
      method: "POST",
      body: JSON.stringify({ athleteEmail }),
    });

    setSubmitting(false);

    if (res.success) {
      setAthleteEmail("");
      setNotice(
        res.message ||
          "Link request sent. The athlete will receive an email invitation and must approve it before access is granted."
      );
      await loadLinks();
    } else {
      setError(res.error || "Unable to send the link request.");
    }
  };

  const toggleDocuments = async (link: GuardianLink) => {
    if (expandedLinkId === link.id) {
      setExpandedLinkId(null);
      return;
    }

    setExpandedLinkId(link.id);
    setError(null);

    if (documentsByLink[link.id]) return;

    setLoadingDocsLinkId(link.id);

    const res = await apiRequest<GuardianDocument[]>(
      `/parent/links/${link.id}/documents`
    );

    setLoadingDocsLinkId(null);

    if (res.success && res.data) {
      setDocumentsByLink((prev) => ({ ...prev, [link.id]: res.data! }));
    } else {
      setError(res.error || "Unable to load this athlete's documents.");
    }
  };

  const handleViewDocument = async (document: GuardianDocument) => {
    setBusyDocId(document.id);
    setError(null);

    const res = await apiRequest<DocumentAccess>(
      `/documents/${document.id}/access`
    );

    setBusyDocId(null);

    if (res.success && res.data) {
      window.open(res.data.downloadUrl, "_blank", "noopener,noreferrer");
    } else {
      setError(res.error || "Unable to open that document.");
    }
  };

  const handleRevoke = async (link: GuardianLink) => {
    if (
      !window.confirm(
        `Remove your ${link.status === "ACTIVE" ? "active" : "pending"} link to ${link.athlete.firstName} ${link.athlete.lastName}?`
      )
    ) {
      return;
    }

    setBusyId(link.id);
    setError(null);
    setNotice(null);

    const res = await apiRequest(`/parent/links/${link.id}`, {
      method: "DELETE",
    });

    setBusyId(null);

    if (res.success) {
      setNotice(res.message || "Guardian link revoked.");
      await loadLinks();
    } else {
      setError(res.error || "Unable to revoke this link.");
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-900 text-xs font-semibold uppercase tracking-wider mb-3">
          <Users className="w-3.5 h-3.5 text-blue-600" />
          <span>Parent & Guardian Oversight</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#102341]">
          Welcome, {user?.firstName} {user?.lastName}
        </h1>
        <p className="text-xs sm:text-sm text-[#65748a] mt-1 leading-relaxed">
          Request a consent-based link to your student-athlete&apos;s account. Athlete approval is
          required before parent access is granted.
        </p>
      </div>

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

      <form
        onSubmit={handleRequest}
        className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 sm:p-8 space-y-4"
      >
        <div className="flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-blue-600" />
          <h2 className="text-base font-bold text-[#102341]">Link a Student-Athlete</h2>
        </div>
        <p className="text-xs text-[#65748a] leading-relaxed">
          Enter the email address the athlete used to create their portal account. They will
          receive a link request to approve or reject.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            value={athleteEmail}
            onChange={(event) => setAthleteEmail(event.target.value)}
            required
            placeholder="athlete@example.com"
            className="flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-[#102341] outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold disabled:opacity-60 cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            {submitting ? "Sending..." : "Request Link"}
          </button>
        </div>
      </form>

      <section className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="p-6 border-b border-slate-200/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <h2 className="text-base font-bold text-[#102341]">Linked Athletes</h2>
            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 rounded-full px-2 py-0.5">
              {activeLinks.length}
            </span>
          </div>
          <button
            type="button"
            onClick={() => void loadLinks()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-[#102341] text-[11px] font-bold disabled:opacity-60 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {loading && (
            <p className="px-6 py-10 text-center text-xs text-[#65748a]">
              Loading linked athletes...
            </p>
          )}

          {!loading && activeLinks.length === 0 && (
            <p className="px-6 py-10 text-center text-xs text-[#65748a]">
              No approved athlete links yet. Send a link request above.
            </p>
          )}

          {activeLinks.map((link) => {
            const profile = link.athlete.athleteProfile;
            const documents = documentsByLink[link.id];
            const expanded = expandedLinkId === link.id;

            return (
              <div key={link.id} className="px-6 py-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="block font-bold text-[#102341]">
                        {link.athlete.firstName} {link.athlete.lastName}
                      </span>
                      {profile && (
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${VERIFICATION_STYLES[profile.verificationStatus]}`}
                        >
                          {VERIFICATION_LABELS[profile.verificationStatus]}
                        </span>
                      )}
                    </div>
                    <span className="block text-[11px] text-[#65748a]">
                      {link.athlete.email}
                    </span>
                    <span className="block text-[10px] text-[#65748a] mt-1">
                      Linked{" "}
                      {new Date(
                        link.respondedAt || link.createdAt
                      ).toLocaleDateString()}
                    </span>
                    {profile && (
                      <div className="mt-2 space-y-1.5">
                        <span className="block text-[11px] text-[#65748a]">
                          {profile.primarySport} · Class of{" "}
                          {profile.graduationYear}
                        </span>
                        <div className="flex items-center gap-2 w-48">
                          <div className="h-1.5 flex-1 rounded-full bg-slate-200 overflow-hidden">
                            <div
                              className="h-full bg-blue-600"
                              style={{
                                width: `${profile.completionPercentage}%`,
                              }}
                            />
                          </div>
                          <span className="text-[10px] font-bold text-[#102341] shrink-0">
                            {profile.completionPercentage}%
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => void toggleDocuments(link)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-[#102341] text-[11px] font-bold disabled:opacity-60 cursor-pointer"
                    >
                      {expanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                      Documents
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleRevoke(link)}
                      disabled={busyId === link.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-red-200 bg-red-50 hover:bg-red-100 text-red-800 text-[11px] font-bold disabled:opacity-60 cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Remove Link
                    </button>
                  </div>
                </div>

                {expanded && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-2">
                    {loadingDocsLinkId === link.id ? (
                      <p className="px-2 py-3 text-center text-xs text-[#65748a] inline-flex items-center gap-2 w-full justify-center">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Loading documents...
                      </p>
                    ) : !documents ? (
                      <p className="px-2 py-3 text-xs text-[#65748a]">
                        Unable to load documents. Close and reopen to retry.
                      </p>
                    ) : documents.length === 0 ? (
                      <p className="px-2 py-3 text-xs text-[#65748a]">
                        This athlete has not uploaded any documents yet.
                      </p>
                    ) : (
                      documents.map((document) => (
                        <div
                          key={document.id}
                          className="px-3 py-2.5 rounded-lg border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                        >
                          <div className="flex items-start gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                              <FileText className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <span className="block font-bold text-[#102341] truncate">
                                {document.title}
                              </span>
                              <span className="block text-[10px] text-[#65748a]">
                                {DOCUMENT_TYPE_LABELS[document.type]} ·{" "}
                                {formatBytes(document.fileSizeBytes)} ·{" "}
                                {new Date(document.createdAt).toLocaleDateString()}
                              </span>
                              {document.status === "REJECTED" &&
                                document.reviewerNotes && (
                                  <span className="block text-[10px] text-red-700 mt-0.5">
                                    Reviewer notes: {document.reviewerNotes}
                                  </span>
                                )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 self-start sm:self-auto">
                            <span
                              className={`inline-flex px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${DOCUMENT_STATUS_STYLES[document.status]}`}
                            >
                              {document.status}
                            </span>
                            <button
                              type="button"
                              onClick={() => void handleViewDocument(document)}
                              disabled={busyDocId === document.id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-[#102341] text-[11px] font-bold disabled:opacity-60 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              View
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {otherLinks.length > 0 && (
        <section className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="p-6 border-b border-slate-200/80 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            <h2 className="text-base font-bold text-[#102341]">Pending & Previous Requests</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {otherLinks.map((link) => (
              <div
                key={link.id}
                className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <span className="block font-bold text-[#102341]">
                    {link.athlete.firstName} {link.athlete.lastName}
                  </span>
                  <span className="block text-[11px] text-[#65748a]">{link.athlete.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLES[link.status]}`}
                  >
                    {link.status}
                  </span>
                  {(link.status === "PENDING" || link.status === "REJECTED") && (
                    <button
                      type="button"
                      onClick={() => void handleRevoke(link)}
                      disabled={busyId === link.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-bold disabled:opacity-60 cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="bg-[#f4f7fc] rounded-2xl p-6 border border-slate-200/90 space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-[#102341]">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <span>Consent-Based Guardian Access</span>
        </div>
        <p className="text-xs text-[#65748a] leading-relaxed">
          Parent access is scoped only to the athletes who approve your request. For
          actively linked athletes you can monitor profile verification progress and
          review uploaded document statuses here. Documents open through short-lived
          secure links and are never publicly accessible.
        </p>
      </div>
    </div>
  );
}
