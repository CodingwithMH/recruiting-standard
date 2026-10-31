"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Link2,
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
  };
}

const STATUS_STYLES: Record<LinkStatus, string> = {
  PENDING: "bg-amber-50 text-amber-800 border-amber-200/80",
  ACTIVE: "bg-emerald-50 text-emerald-800 border-emerald-200/80",
  REJECTED: "bg-red-50 text-red-800 border-red-200/80",
  REVOKED: "bg-slate-100 text-slate-700 border-slate-200",
};

export default function ParentPortalPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [links, setLinks] = useState<GuardianLink[]>([]);
  const [athleteEmail, setAthleteEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
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
            <Link2 className="w-3.5 h-3.5" />
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

          {activeLinks.map((link) => (
            <div
              key={link.id}
              className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div>
                <span className="block font-bold text-[#102341]">
                  {link.athlete.firstName} {link.athlete.lastName}
                </span>
                <span className="block text-[11px] text-[#65748a]">{link.athlete.email}</span>
                <span className="block text-[10px] text-[#65748a] mt-1">
                  Linked {new Date(link.respondedAt || link.createdAt).toLocaleDateString()}
                </span>
              </div>
              <button
                type="button"
                onClick={() => void handleRevoke(link)}
                disabled={busyId === link.id}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-red-200 bg-red-50 hover:bg-red-100 text-red-800 text-[11px] font-bold disabled:opacity-60 cursor-pointer self-start sm:self-auto"
              >
                <XCircle className="w-3.5 h-3.5" />
                Remove Link
              </button>
            </div>
          ))}
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
          Parent access is scoped only to the athletes who approve your request. Full athlete
          profile details and document review tools are delivered in Milestone 3.
        </p>
      </div>
    </div>
  );
}
