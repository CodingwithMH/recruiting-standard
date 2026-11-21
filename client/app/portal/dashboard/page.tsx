"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertCircle,
  BookmarkCheck,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  GraduationCap,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import SiteLink from "@/components/ui/SiteLink";
import { getStoredUser } from "@/lib/auth";
import { apiRequest } from "@/lib/api";
import type { UserProfile } from "@/lib/api";

interface SubscriptionInfo {
  plan: string;
  state: string;
  effectiveState: string;
  effectivePaymentStatus: string;
  accessAllowed: boolean;
  expirationDate: string | null;
  startDate: string | null;
  basePriceCents: number;
  amountDueCents: number;
  isLate: boolean;
}

interface DashboardAthlete {
  athleteId: string;
  profileId: string | null;
  name: string;
  email: string;
  sport: string | null;
  graduationYear: number | null;
  completionPercentage: number;
  status: string;
  verificationStatus: string | null;
}

interface DashboardProspect {
  id: string;
  savedAt: string;
  profileId: string;
  name: string;
  sport: string | null;
  graduationYear: number;
}

interface DashboardActivityItem {
  id: string;
  type: "CONTACT" | "OFFER" | "COMMITMENT" | "RECORD";
  label: string;
  athleteName: string;
  profileId: string;
  recordId: string;
  at: string;
}

type RecruitingStatus =
  | "EVALUATING"
  | "CONTACTED"
  | "OFFERED"
  | "COMMITTED"
  | "PASSED";

interface SchoolDashboardData {
  athletes: {
    total: number;
    active: number;
    pendingApproval: number;
    verified: number;
    items: DashboardAthlete[];
  };
  incompleteProfiles: {
    total: number;
    items: DashboardAthlete[];
  };
  savedProspects: {
    total: number;
    items: DashboardProspect[];
  };
  recruitingActivity: {
    totalRecords: number;
    statusCounts: Record<RecruitingStatus, number>;
    contactCount: number;
    offerCount: number;
    commitmentCount: number;
    items: DashboardActivityItem[];
  };
}

const PIPELINE_STAGES: Array<{
  key: RecruitingStatus;
  label: string;
  className: string;
}> = [
  { key: "EVALUATING", label: "Evaluating", className: "bg-blue-50 text-blue-700 border-blue-200" },
  { key: "CONTACTED", label: "Contacted", className: "bg-amber-50 text-amber-700 border-amber-200" },
  { key: "OFFERED", label: "Offered", className: "bg-purple-50 text-purple-700 border-purple-200" },
  { key: "COMMITTED", label: "Committed", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { key: "PASSED", label: "Passed", className: "bg-slate-100 text-slate-600 border-slate-200" },
];

const ACTIVITY_STYLES: Record<DashboardActivityItem["type"], string> = {
  CONTACT: "bg-blue-50 text-blue-700 border-blue-200",
  OFFER: "bg-purple-50 text-purple-700 border-purple-200",
  COMMITMENT: "bg-emerald-50 text-emerald-700 border-emerald-200",
  RECORD: "bg-slate-100 text-slate-600 border-slate-200",
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

function formatSavedDate(value: string): string {
  const parsed = new Date(value);
  return isNaN(parsed.getTime())
    ? "—"
    : parsed.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
}

export default function SchoolDashboardPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [subLoading, setSubLoading] = useState(true);
  const [dashboard, setDashboard] = useState<SchoolDashboardData | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  const primaryMembership = user?.memberships?.[0];
  const school = primaryMembership?.school;
  const schoolId = school?.id;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser(getStoredUser());
  }, []);

  useEffect(() => {
    const fetchSubscription = async () => {
      const res = await apiRequest<SubscriptionInfo>("subscriptions/my");
      if (res.success && res.data) {
        setSubscription(res.data);
      }
      setSubLoading(false);
    };
    void fetchSubscription();
  }, []);

  const loadDashboard = useCallback(async () => {
    if (!schoolId) {
      setDashboardLoading(false);
      setDashboardError("Your account is not linked to a school roster.");
      return;
    }

    setDashboardLoading(true);
    setDashboardError(null);

    const res = await apiRequest<SchoolDashboardData>(`/schools/${schoolId}/dashboard`);

    if (res.success && res.data) {
      setDashboard(res.data);
    } else {
      setDashboard(null);
      setDashboardError(res.error || "Unable to load your school dashboard.");
    }

    setDashboardLoading(false);
  }, [schoolId]);

  useEffect(() => {
    if (schoolId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void loadDashboard();
    }
  }, [schoolId, loadDashboard]);

  const snapshotCards = [
    {
      label: "Athletes",
      value: dashboard?.athletes.total,
      note: `${dashboard?.athletes.pendingApproval ?? 0} pending approval · ${dashboard?.athletes.active ?? 0} active`,
      href: "/portal/athletes",
      icon: GraduationCap,
      tone: "bg-blue-50 text-blue-700",
    },
    {
      label: "Incomplete Profiles",
      value: dashboard?.incompleteProfiles.total,
      note: "Athlete profiles below 100% complete",
      href: "/portal/athletes",
      icon: ClipboardList,
      tone: "bg-amber-50 text-amber-700",
    },
    {
      label: "Saved Prospects",
      value: dashboard?.savedProspects.total,
      note: "Athletes on your recruiting watchlist",
      href: "/portal/prospects",
      icon: BookmarkCheck,
      tone: "bg-emerald-50 text-emerald-700",
    },
    {
      label: "Recruiting Activity",
      value: dashboard?.recruitingActivity.totalRecords,
      note: `${dashboard?.recruitingActivity.contactCount ?? 0} contacts · ${dashboard?.recruitingActivity.offerCount ?? 0} offers`,
      href: "/portal/records",
      icon: Activity,
      tone: "bg-purple-50 text-purple-700",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-900 text-xs font-semibold uppercase tracking-wider mb-3">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>Verified Institutional Access</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#102341]">
            Welcome back, {user?.firstName || "Coach"}
          </h1>
          <p className="text-xs sm:text-sm text-[#65748a] mt-1 leading-relaxed">
            {school?.name || "Your School"} · Portal Dashboard &amp; Recruitment Command
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-[#f4f7fc] border border-slate-200/80 rounded-xl px-4 py-2.5 text-left">
            <span className="block text-[10px] uppercase font-bold text-slate-500 font-mono tracking-wider">
              PERMANENT SCHOOL ID
            </span>
            <span className="text-sm font-bold font-mono text-[#102341]">
              {school?.schoolId || "SCH-PENDING"}
            </span>
          </div>
          <div className="bg-[#f4f7fc] border border-slate-200/80 rounded-xl px-4 py-2.5 text-left">
            <span className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              INSTITUTION STATUS
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {school?.status || "APPROVED"}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-[#102341] shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#102341]">Institutional Subscription</h3>
                {subLoading ? (
                  <span className="text-xs text-slate-400">Loading...</span>
                ) : subscription ? (
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                      subscription.effectiveState === "ACTIVE"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : subscription.effectiveState === "SUSPENDED"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-red-50 text-red-700 border border-red-200"
                    }`}
                  >
                    {subscription.effectiveState}
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">Not configured</span>
                )}
              </div>
              <p className="text-xs text-[#65748a] mt-0.5">
                Managed independently by platform administration. Controls recruiting access separately from school registration approval.
              </p>
            </div>
          </div>

          {subscription && (
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Plan</span>
                <span className="font-bold text-[#102341]">
                  {subscription.plan === "ANNUAL_1500" ? "Annual ($1,500/yr)" : "Monthly ($250/mo)"}
                </span>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Payment</span>
                <span className={`font-bold ${subscription.effectivePaymentStatus === "PAID" ? "text-emerald-700" : "text-amber-600"}`}>
                  {subscription.effectivePaymentStatus}
                </span>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Expires / Renews</span>
                <span className="font-bold text-[#102341]">
                  {subscription.expirationDate
                    ? new Date(subscription.expirationDate).toLocaleDateString()
                    : "No expiration set"}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {dashboardError && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{dashboardError}</span>
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
          School Snapshot
        </h2>
        <button
          type="button"
          onClick={() => void loadDashboard()}
          disabled={dashboardLoading}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-[#102341] text-[11px] font-bold disabled:opacity-60 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${dashboardLoading ? "animate-spin" : ""}`} />
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
                  {dashboardLoading ? "—" : (card.value ?? 0)}
                </p>
                <p className="text-[11px] text-[#65748a] mt-1">{card.note}</p>
              </div>
            </SiteLink>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-[#102341]">Athletes</h2>
              <p className="text-[11px] text-[#65748a]">
                Roster verification and profile status for your institution.
              </p>
            </div>
            <SiteLink href="/portal/athletes" className="text-[11px] font-bold text-blue-700 hover:underline">
              Full roster ↗
            </SiteLink>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Active", value: dashboard?.athletes.active },
              { label: "Pending", value: dashboard?.athletes.pendingApproval },
              { label: "Verified", value: dashboard?.athletes.verified },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-slate-200 bg-[#f4f7fc] px-3 py-2">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {item.label}
                </span>
                <span className="text-lg font-bold text-[#102341]">
                  {dashboardLoading ? "—" : (item.value ?? 0)}
                </span>
              </div>
            ))}
          </div>

          {dashboardLoading ? (
            <div className="py-10 text-center text-xs text-slate-400">Loading athletes...</div>
          ) : dashboard?.athletes.items.length ? (
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
              {dashboard.athletes.items.map((athlete) => (
                <div key={athlete.athleteId} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    {athlete.profileId ? (
                      <SiteLink
                        href={`/portal/athletes/${athlete.profileId}`}
                        className="block truncate text-xs font-bold text-[#102341] hover:text-blue-700"
                      >
                        {athlete.name}
                      </SiteLink>
                    ) : (
                      <span className="block truncate text-xs font-bold text-[#102341]">{athlete.name}</span>
                    )}
                    <span className="block truncate text-[10px] text-[#65748a]">
                      {athlete.sport || "Sport not listed"}
                      {athlete.graduationYear ? ` · Class of ${athlete.graduationYear}` : ""}
                    </span>
                  </div>
                  <span
                    className={`shrink-0 inline-flex px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider ${
                      athlete.status === "ACTIVE"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : athlete.status === "PENDING"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-slate-100 text-slate-600 border-slate-200"
                    }`}
                  >
                    {athlete.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 py-10 text-center">
              <GraduationCap className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700">No athletes on your roster yet</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Athletes who register with your School ID will appear here.
              </p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-[#102341]">Incomplete Profiles</h2>
              <p className="text-[11px] text-[#65748a]">
                Athlete profiles that still need attention.
              </p>
            </div>
            <SiteLink href="/portal/athletes" className="text-[11px] font-bold text-blue-700 hover:underline">
              Review roster ↗
            </SiteLink>
          </div>

          {dashboardLoading ? (
            <div className="py-10 text-center text-xs text-slate-400">Loading profiles...</div>
          ) : dashboard?.incompleteProfiles.items.length ? (
            <div className="space-y-3">
              {dashboard.incompleteProfiles.items.map((athlete) => (
                <div key={athlete.athleteId} className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {athlete.profileId ? (
                        <SiteLink
                          href={`/portal/athletes/${athlete.profileId}`}
                          className="block truncate text-xs font-bold text-[#102341] hover:text-blue-700"
                        >
                          {athlete.name}
                        </SiteLink>
                      ) : (
                        <span className="block truncate text-xs font-bold text-[#102341]">{athlete.name}</span>
                      )}
                      <span className="block truncate text-[10px] text-[#65748a]">
                        {athlete.sport || "Sport not listed"}
                        {athlete.graduationYear ? ` · Class of ${athlete.graduationYear}` : ""}
                      </span>
                    </div>
                    <span className="shrink-0 text-xs font-bold text-[#102341]">
                      {athlete.completionPercentage}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-200">
                    <div
                      className="h-1.5 rounded-full bg-amber-500"
                      style={{ width: `${Math.min(Math.max(athlete.completionPercentage, 0), 100)}%` }}
                    />
                  </div>
                  {!athlete.profileId && (
                    <p className="text-[10px] text-amber-700">Profile not started yet.</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 py-10 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700">All profiles are complete</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Profiles below 100% will be listed here.
              </p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-[#102341]">Saved Prospects</h2>
              <p className="text-[11px] text-[#65748a]">
                Recently saved athletes across your school.
              </p>
            </div>
            <SiteLink href="/portal/prospects" className="text-[11px] font-bold text-blue-700 hover:underline">
              Watchlist ↗
            </SiteLink>
          </div>

          {dashboardLoading ? (
            <div className="py-10 text-center text-xs text-slate-400">Loading prospects...</div>
          ) : dashboard?.savedProspects.items.length ? (
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
              {dashboard.savedProspects.items.map((prospect) => (
                <div key={prospect.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <SiteLink
                      href={`/portal/athletes/${prospect.profileId}`}
                      className="block truncate text-xs font-bold text-[#102341] hover:text-blue-700"
                    >
                      {prospect.name}
                    </SiteLink>
                    <span className="block truncate text-[10px] text-[#65748a]">
                      {prospect.sport || "Sport not listed"}
                      {prospect.graduationYear ? ` · Class of ${prospect.graduationYear}` : ""}
                    </span>
                  </div>
                  <span className="shrink-0 text-[10px] text-slate-400">
                    {formatSavedDate(prospect.savedAt)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 py-10 text-center">
              <BookmarkCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700">No saved prospects yet</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Save approved athletes from talent search to build your watchlist.
              </p>
              <SiteLink
                href="/portal/search"
                className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:underline"
              >
                Search athletes ↗
              </SiteLink>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-[#102341]">Recruiting Activity</h2>
              <p className="text-[11px] text-[#65748a]">
                Pipeline totals and the latest updates from your records.
              </p>
            </div>
            <SiteLink href="/portal/records" className="text-[11px] font-bold text-blue-700 hover:underline">
              All records ↗
            </SiteLink>
          </div>

          <div className="flex flex-wrap gap-2">
            {PIPELINE_STAGES.map((stage) => (
              <span
                key={stage.key}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${stage.className}`}
              >
                {stage.label}
                <span className="font-mono">
                  {dashboardLoading ? "—" : (dashboard?.recruitingActivity.statusCounts[stage.key] ?? 0)}
                </span>
              </span>
            ))}
          </div>

          {dashboardLoading ? (
            <div className="py-10 text-center text-xs text-slate-400">Loading activity...</div>
          ) : dashboard?.recruitingActivity.items.length ? (
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
              {dashboard.recruitingActivity.items.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <SiteLink
                      href={`/portal/records?athleteId=${item.profileId}`}
                      className="block truncate text-xs font-bold text-[#102341] hover:text-blue-700"
                    >
                      {item.athleteName}
                    </SiteLink>
                    <span className="block truncate text-[10px] text-[#65748a]">{item.label}</span>
                  </div>
                  <div className="shrink-0 text-right">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider ${ACTIVITY_STYLES[item.type]}`}
                    >
                      {item.type}
                    </span>
                    <span className="block text-[10px] text-slate-400 mt-1">
                      {formatRelativeDate(item.at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 py-10 text-center">
              <ClipboardList className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700">No recruiting activity yet</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Contacts, offers, and commitments will appear here.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-[#f4f7fc] rounded-2xl p-6 border border-slate-200/90 space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-[#102341]">
          <Sparkles className="w-4 h-4 text-blue-600" />
          <span>Strict Institutional Tenant Isolation Active</span>
        </div>
        <p className="text-xs text-[#65748a] leading-relaxed">
          Your session is cryptographically bound to <strong className="text-[#102341]">{school?.name || "your institution"}</strong>.
          Every database query enforces strict school ID tenancy checks. Other schools cannot view your saved
          athletes, private evaluations, or recruitment records.
        </p>
      </div>
    </div>
  );
}
