"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  GraduationCap,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import type { UserProfile } from "@/lib/api";
import { getStoredUser } from "@/lib/auth";
import AthleteProfileBuilder from "@/components/athlete/AthleteProfileBuilder";
import HighlightVideos from "@/components/athlete/HighlightVideos";
import PrivateDocuments from "@/components/athlete/PrivateDocuments";

type LinkStatus = "PENDING" | "ACTIVE" | "REJECTED" | "REVOKED";

interface GuardianLink {
  id: string;
  status: LinkStatus;
  respondedAt: string | null;
  createdAt: string;
  parent: {
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

export default function AthletePortalPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [links, setLinks] = useState<GuardianLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadLinks = useCallback(async () => {
    setLoading(true);
    setError(null);

    const res = await apiRequest<GuardianLink[]>("/athlete/guardian-links");

    if (res.success && res.data) {
      setLinks(res.data);
    } else {
      setLinks([]);
      setError(res.error || "Unable to load guardian link requests.");
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser(getStoredUser());
    void loadLinks();
  }, [loadLinks]);

  const pendingLinks = links.filter((link) => link.status === "PENDING");
  const activeLinks = links.filter((link) => link.status === "ACTIVE");
  const previousLinks = links.filter(
    (link) => link.status === "REJECTED" || link.status === "REVOKED"
  );

  const runAction = async (
    link: GuardianLink,
    action: "approve" | "reject" | "revoke"
  ) => {
    if (action === "revoke") {
      if (
        !window.confirm(
          `Remove ${link.parent.firstName} ${link.parent.lastName}'s access to your account?`
        )
      ) {
        return;
      }
    }

    setBusyId(link.id);
    setError(null);
    setNotice(null);

    const endpoint =
      action === "revoke"
        ? `/athlete/guardian-links/${link.id}`
        : `/athlete/guardian-links/${link.id}/${action}`;

    const res = await apiRequest(endpoint, {
      method: action === "revoke" ? "DELETE" : "POST",
    });

    setBusyId(null);

    if (res.success) {
      setNotice(res.message || "Guardian link updated.");
      await loadLinks();
    } else {
      setError(res.error || "Unable to update this guardian link.");
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-900 text-xs font-semibold uppercase tracking-wider mb-3">
          <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
          <span>Student-Athlete Portal</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#102341]">
          Welcome, {user?.firstName} {user?.lastName}
        </h1>
        <p className="text-xs sm:text-sm text-[#65748a] mt-1 leading-relaxed">
          Build your multi-sport recruiting profile, publish highlight film, and manage who
          can access your account.
        </p>
      </div>

      <AthleteProfileBuilder />

      <PrivateDocuments />

      <HighlightVideos />

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

      <section className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="p-6 border-b border-slate-200/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600" />
            <h2 className="text-base font-bold text-[#102341]">Guardian Link Requests</h2>
            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 rounded-full px-2 py-0.5">
              {pendingLinks.length}
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
              Loading guardian link requests...
            </p>
          )}

          {!loading && pendingLinks.length === 0 && (
            <p className="px-6 py-10 text-center text-xs text-[#65748a]">
              No pending guardian link requests.
            </p>
          )}

          {pendingLinks.map((link) => (
            <div
              key={link.id}
              className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div>
                <span className="block font-bold text-[#102341]">
                  {link.parent.firstName} {link.parent.lastName}
                </span>
                <span className="block text-[11px] text-[#65748a]">{link.parent.email}</span>
                <span className="block text-[10px] text-[#65748a] mt-1">
                  Requested {new Date(link.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void runAction(link, "approve")}
                  disabled={busyId === link.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold disabled:opacity-60 cursor-pointer"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => void runAction(link, "reject")}
                  disabled={busyId === link.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-red-200 bg-red-50 hover:bg-red-100 text-red-800 text-[11px] font-bold disabled:opacity-60 cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="p-6 border-b border-slate-200/80 flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-600" />
          <h2 className="text-base font-bold text-[#102341]">Authorized Guardians</h2>
          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 rounded-full px-2 py-0.5">
            {activeLinks.length}
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {!loading && activeLinks.length === 0 && (
            <p className="px-6 py-10 text-center text-xs text-[#65748a]">
              No guardians currently have access to your account.
            </p>
          )}

          {activeLinks.map((link) => (
            <div
              key={link.id}
              className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div>
                <span className="block font-bold text-[#102341]">
                  {link.parent.firstName} {link.parent.lastName}
                </span>
                <span className="block text-[11px] text-[#65748a]">{link.parent.email}</span>
                {link.respondedAt && (
                  <span className="block text-[10px] text-[#65748a] mt-1">
                    Approved {new Date(link.respondedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => void runAction(link, "revoke")}
                disabled={busyId === link.id}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-red-200 bg-red-50 hover:bg-red-100 text-red-800 text-[11px] font-bold disabled:opacity-60 cursor-pointer self-start sm:self-auto"
              >
                <XCircle className="w-3.5 h-3.5" />
                Revoke Access
              </button>
            </div>
          ))}
        </div>
      </section>

      {previousLinks.length > 0 && (
        <section className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="p-6 border-b border-slate-200/80 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-slate-500" />
            <h2 className="text-base font-bold text-[#102341]">Link History</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {previousLinks.map((link) => (
              <div
                key={link.id}
                className="px-6 py-4 flex items-center justify-between gap-3"
              >
                <div>
                  <span className="block font-bold text-[#102341]">
                    {link.parent.firstName} {link.parent.lastName}
                  </span>
                  <span className="block text-[11px] text-[#65748a]">{link.parent.email}</span>
                </div>
                <span
                  className={`inline-flex px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLES[link.status]}`}
                >
                  {link.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

    </div>
  );
}
