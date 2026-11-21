"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock,
  CreditCard,
  FileCheck,
  RefreshCw,
  ShieldAlert,
  Users,
} from "lucide-react";
import SiteLink from "@/components/ui/SiteLink";
import SchoolApprovalQueue from "@/components/admin/SchoolApprovalQueue";
import { getStoredUser } from "@/lib/auth";
import { apiRequest } from "@/lib/api";
import type { UserProfile } from "@/lib/api";

type SchoolStatus = "PENDING" | "APPROVED" | "SUSPENDED" | "REJECTED";
type GlobalRole = "PLATFORM_ADMIN" | "SCHOOL_STAFF" | "ATHLETE" | "PARENT";
type UserStatus = "PENDING" | "ACTIVE" | "INACTIVE" | "SUSPENDED";
type ActivityType = "SCHOOL" | "USER" | "PROFILE" | "DOCUMENT" | "SUBSCRIPTION";
type SubscriptionState =
  | "ACTIVE"
  | "SUSPENDED"
  | "CANCELLED"
  | "EXPIRED"
  | "PENDING";

interface PlatformActivityEvent {
  id: string;
  type: ActivityType;
  label: string;
  subject: string;
  at: string;
  href: string;
}

interface PlatformDashboardData {
  schools: {
    total: number;
    statusCounts: Record<SchoolStatus, number>;
    items: Array<{
      id: string;
      name: string;
      schoolId: string | null;
      status: SchoolStatus;
      createdAt: string;
    }>;
  };
  users: {
    total: number;
    roleCounts: Record<GlobalRole, number>;
    statusCounts: Record<UserStatus, number>;
    items: Array<{
      id: string;
      name: string;
      email: string;
      role: GlobalRole;
      status: UserStatus;
      createdAt: string;
    }>;
  };
  verificationQueue: {
    profilesPending: number;
    documentsPending: number;
    athletes: Array<{
      id: string;
      name: string;
      email: string;
      sport: string;
      graduationYear: number;
      completionPercentage: number;
      submittedAt: string | null;
      pendingDocuments: number;
    }>;
    documents: Array<{
      id: string;
      title: string;
      type: string;
      athleteName: string;
      createdAt: string;
    }>;
  };
  platformActivity: {
    activeSubscriptions: number;
    subscriptionCounts: Record<SubscriptionState, number>;
    recruitingRecords: number;
    savedProspects: number;
    events: PlatformActivityEvent[];
  };
}

const SCHOOL_STAGES: Array<{ key: SchoolStatus; label: string; className: string }> = [
  { key: "PENDING", label: "Pending", className: "bg-amber-50 text-amber-700 border-amber-200" },
  { key: "APPROVED", label: "Approved", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { key: "SUSPENDED", label: "Suspended", className: "bg-slate-100 text-slate-600 border-slate-200" },
  { key: "REJECTED", label: "Rejected", className: "bg-red-50 text-red-700 border-red-200" },
];

const USER_ROLES: Array<{ key: GlobalRole; label: string }> = [
  { key: "PLATFORM_ADMIN", label: "Admins" },
  { key: "SCHOOL_STAFF", label: "School staff" },
  { key: "ATHLETE", label: "Athletes" },
  { key: "PARENT", label: "Parents" },
];

const ACTIVITY_STYLES: Record<ActivityType, string> = {
  SCHOOL: "bg-blue-50 text-blue-700 border-blue-200",
  USER: "bg-slate-100 text-slate-600 border-slate-200",
  PROFILE: "bg-amber-50 text-amber-700 border-amber-200",
  DOCUMENT: "bg-purple-50 text-purple-700 border-purple-200",
  SUBSCRIPTION: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

function formatRelativeDate(value: string): string {
  const parsed = new Date(value);
  if (isNaN(parsed.getTime())) return "—";

  const minutes = Math.floor((Date.now() - parsed.getTime()) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function AdminDashboardPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [dashboard, setDashboard] = useState<PlatformDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser(getStoredUser());
  }, []);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    const res = await apiRequest<PlatformDashboardData>("/admin/dashboard");

    if (res.success && res.data) {
      setDashboard(res.data);
    } else {
      setDashboard(null);
      setError(res.error || "Unable to load the platform dashboard.");
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadDashboard();
  }, [loadDashboard]);

  const snapshotCards = [
    {
      label: "Schools",
      value: dashboard?.schools.total,
      note: `${dashboard?.schools.statusCounts.PENDING ?? 0} pending approval`,
      href: "/admin/dashboard",
      icon: Building2,
      tone: "bg-blue-50 text-blue-700",
    },
    {
      label: "Users",
      value: dashboard?.users.total,
      note: `${dashboard?.users.statusCounts.PENDING ?? 0} awaiting activation`,
      href: "/admin/users",
      icon: Users,
      tone: "bg-slate-100 text-slate-700",
    },
    {
      label: "Verification Queue",
      value:
        (dashboard?.verificationQueue.profilesPending ?? 0) +
        (dashboard?.verificationQueue.documentsPending ?? 0),
      note: `${dashboard?.verificationQueue.profilesPending ?? 0} profiles · ${dashboard?.verificationQueue.documentsPending ?? 0} documents`,
      href: "/admin/verifications",
      icon: FileCheck,
      tone: "bg-amber-50 text-amber-700",
    },
    {
      label: "Platform Activity",
      value: dashboard?.platformActivity.activeSubscriptions,
      note: `${dashboard?.platformActivity.recruitingRecords ?? 0} recruiting records tracked`,
      href: "/admin/subscriptions",
      icon: Activity,
      tone: "bg-emerald-50 text-emerald-700",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 border border-red-200/80 text-red-900 text-xs font-semibold uppercase tracking-wider mb-3">
            <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
            <span>Platform Administrator Authority</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#102341]">
            Platform Overview &amp; Queues
          </h1>
          <p className="text-xs sm:text-sm text-[#65748a] mt-1 leading-relaxed">
            Logged in as <strong className="text-[#102341]">{user?.email}</strong>. Review institutions,
            accounts, verification requests, and platform-wide activity.
          </p>
        </div>

        <div className="bg-[#f4f7fc] border border-slate-200/80 rounded-xl px-4 py-3 text-left">
          <span className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            SYSTEM STATUS
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Production Architecture Active
          </span>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => void loadDashboard()}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-red-700 hover:text-red-900 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[#65748a]">
          Platform Snapshot
        </h2>
        <button
          type="button"
          onClick={() => void loadDashboard()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-[#102341] text-[11px] font-bold disabled:opacity-60 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Dashboard
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {snapshotCards.map((card) => {
          const Icon = card.icon;
          return (
            <SiteLink
              key={card.label}
              href={card.href}
              className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs hover:border-blue-300 transition-colors space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.tone}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-blue-600">VIEW ↗</span>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#65748a]">
                  {card.label}
                </p>
                <p className="text-3xl font-bold tracking-tight text-[#102341]">
                  {loading ? "—" : (card.value ?? 0)}
                </p>
                <p className="text-[11px] text-[#65748a] mt-1">{card.note}</p>
              </div>
            </SiteLink>
          );
        })}
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-[#102341]">Schools</h2>
            <p className="text-[11px] text-[#65748a]">
              Registration workflow and institutional status across the platform.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {SCHOOL_STAGES.map((stage) => (
              <span
                key={stage.key}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${stage.className}`}
              >
                {stage.label}
                <span className="font-mono">
                  {loading ? "—" : (dashboard?.schools.statusCounts[stage.key] ?? 0)}
                </span>
              </span>
            ))}
          </div>
        </div>
        <SchoolApprovalQueue />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-[#102341]">Users</h2>
              <p className="text-[11px] text-[#65748a]">
                Account distribution and the most recent registrations.
              </p>
            </div>
            <SiteLink href="/admin/users" className="text-[11px] font-bold text-blue-700 hover:underline">
              All users ↗
            </SiteLink>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {USER_ROLES.map((role) => (
              <div key={role.key} className="rounded-xl border border-slate-200 bg-[#f4f7fc] px-3 py-2">
                <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  {role.label}
                </span>
                <span className="text-lg font-bold text-[#102341]">
                  {loading ? "—" : (dashboard?.users.roleCounts[role.key] ?? 0)}
                </span>
              </div>
            ))}
          </div>

          {loading ? (
            <div className="py-10 text-center text-xs text-slate-400">Loading users...</div>
          ) : dashboard?.users.items.length ? (
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
              {dashboard.users.items.map((account) => (
                <div key={account.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <span className="block truncate text-xs font-bold text-[#102341]">
                      {account.name}
                    </span>
                    <span className="block truncate text-[10px] text-[#65748a]">{account.email}</span>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-500">
                      {account.role.replace("_", " ")}
                    </span>
                    <span
                      className={`inline-flex mt-1 px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider ${
                        account.status === "ACTIVE"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : account.status === "PENDING"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-slate-100 text-slate-600 border-slate-200"
                      }`}
                    >
                      {account.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 py-10 text-center">
              <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700">No accounts yet</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-[#102341]">Verification Queue</h2>
              <p className="text-[11px] text-[#65748a]">
                Athlete profiles and documents awaiting review.
              </p>
            </div>
            <SiteLink href="/admin/verifications" className="text-[11px] font-bold text-blue-700 hover:underline">
              Review queue ↗
            </SiteLink>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-amber-700">
                Profiles pending
              </span>
              <span className="text-lg font-bold text-amber-900">
                {loading ? "—" : (dashboard?.verificationQueue.profilesPending ?? 0)}
              </span>
            </div>
            <div className="rounded-xl border border-purple-200 bg-purple-50 px-3 py-2">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-purple-700">
                Documents pending
              </span>
              <span className="text-lg font-bold text-purple-900">
                {loading ? "—" : (dashboard?.verificationQueue.documentsPending ?? 0)}
              </span>
            </div>
          </div>

          {loading ? (
            <div className="py-10 text-center text-xs text-slate-400">Loading queue...</div>
          ) : dashboard?.verificationQueue.athletes.length ||
            dashboard?.verificationQueue.documents.length ? (
            <div className="space-y-4">
              {dashboard?.verificationQueue.athletes.length ? (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#65748a]">
                    Profiles awaiting review
                  </p>
                  <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                    {dashboard.verificationQueue.athletes.map((athlete) => (
                      <SiteLink
                        key={athlete.id}
                        href="/admin/verifications"
                        className="block px-4 py-3 hover:bg-slate-50/70 transition-colors"
                      >
                        <span className="flex items-center justify-between gap-3">
                          <span className="truncate text-xs font-bold text-[#102341]">
                            {athlete.name}
                          </span>
                          <span className="shrink-0 text-[10px] text-slate-400">
                            {athlete.submittedAt ? formatRelativeDate(athlete.submittedAt) : "—"}
                          </span>
                        </span>
                        <span className="block truncate text-[10px] text-[#65748a]">
                          {athlete.sport} · Class of {athlete.graduationYear} · {athlete.completionPercentage}% complete
                          {athlete.pendingDocuments > 0
                            ? ` · ${athlete.pendingDocuments} documents pending`
                            : ""}
                        </span>
                      </SiteLink>
                    ))}
                  </div>
                </div>
              ) : null}

              {dashboard?.verificationQueue.documents.length ? (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#65748a]">
                    Documents awaiting review
                  </p>
                  <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                    {dashboard.verificationQueue.documents.map((document) => (
                      <SiteLink
                        key={document.id}
                        href="/admin/documents"
                        className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50/70 transition-colors"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-bold text-[#102341]">
                            {document.title}
                          </span>
                          <span className="block truncate text-[10px] text-[#65748a]">
                            {document.athleteName}
                          </span>
                        </span>
                        <span className="shrink-0 text-[10px] text-slate-400">
                          {formatRelativeDate(document.createdAt)}
                        </span>
                      </SiteLink>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 py-10 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700">Verification queues are clear</p>
              <p className="text-[11px] text-slate-400 mt-1">
                New submissions will appear here for review.
              </p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-[#102341]">Platform Activity</h2>
              <p className="text-[11px] text-[#65748a]">
                Recent registrations, reviews, and subscription changes across the platform.
              </p>
            </div>
            <SiteLink href="/admin/subscriptions" className="text-[11px] font-bold text-blue-700 hover:underline">
              Subscriptions ↗
            </SiteLink>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
              <CreditCard className="w-3 h-3" />
              {loading ? "—" : (dashboard?.platformActivity.activeSubscriptions ?? 0)} active subscriptions
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700">
              <ShieldAlert className="w-3 h-3" />
              {loading ? "—" : (dashboard?.platformActivity.recruitingRecords ?? 0)} recruiting records
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700">
              <Clock className="w-3 h-3" />
              {loading ? "—" : (dashboard?.platformActivity.savedProspects ?? 0)} saved prospects
            </span>
          </div>

          {loading ? (
            <div className="py-10 text-center text-xs text-slate-400">Loading activity...</div>
          ) : dashboard?.platformActivity.events.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {dashboard.platformActivity.events.map((event) => (
                <SiteLink
                  key={event.id}
                  href={event.href}
                  className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/40 p-3 hover:border-blue-300 transition-colors"
                >
                  <div className="min-w-0">
                    <span className="block truncate text-xs font-bold text-[#102341]">
                      {event.subject}
                    </span>
                    <span className="block text-[10px] text-[#65748a]">{event.label}</span>
                  </div>
                  <div className="shrink-0 text-right">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider ${ACTIVITY_STYLES[event.type]}`}
                    >
                      {event.type}
                    </span>
                    <span className="block text-[10px] text-slate-400 mt-1">
                      {formatRelativeDate(event.at)}
                    </span>
                  </div>
                </SiteLink>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 py-10 text-center">
              <Activity className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700">No platform activity yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
