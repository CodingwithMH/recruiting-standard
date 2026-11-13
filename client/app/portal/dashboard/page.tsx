"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, Search, BookmarkCheck, Sparkles, GraduationCap, CreditCard, ClipboardList } from "lucide-react";
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

export default function SchoolDashboardPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [subLoading, setSubLoading] = useState(true);

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

  const primaryMembership = user?.memberships?.[0];
  const school = primaryMembership?.school;

  return (
    <div className="space-y-8">
      {/* Header Banner */}
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
            {school?.name || "Your School"} · Portal Dashboard & Recruitment Command
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

      {/* Subscription Status Card */}
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

      {/* Quick Action / Module Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Module 1: Institutional Athlete Roster */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-700">
              <GraduationCap className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#102341]">Student-Athlete Roster</h3>
            <p className="text-xs text-[#65748a] leading-relaxed">
              Review and approve student-athletes who registered with your School ID. Verify eligibility and unlock portal recruiting access.
            </p>
          </div>
          <div className="pt-2">
            <SiteLink
              href="/portal/athletes"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#102341] hover:bg-[#1d3d68] text-white text-xs font-bold transition-colors"
            >
              <span>Manage & Approve Athletes</span>
              <span>↗</span>
            </SiteLink>
          </div>
        </div>

        {/* Module 2: Athlete Discovery Engine */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-[#102341]">
              <Search className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#102341]">Verified Talent Search</h3>
            <p className="text-xs text-[#65748a] leading-relaxed">
              Explore administrator-approved student-athletes filtered by sport, graduation year,
              position or event, and location.
            </p>
          </div>
          <div className="pt-2">
            <SiteLink
              href="/portal/search"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#102341] hover:bg-[#1d3d68] text-white text-xs font-bold transition-colors"
            >
              <span>Search Approved Athletes</span>
              <span>↗</span>
            </SiteLink>
          </div>
        </div>

        {/* Module 3: Private Prospects */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-700">
              <BookmarkCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#102341]">Prospect Watchlist</h3>
            <p className="text-xs text-[#65748a] leading-relaxed">
              Curate custom watchlists and athlete bookmarks with staff notes, safe from competitor schools.
            </p>
          </div>
          <div className="pt-2">
            <SiteLink
              href="/portal/prospects"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#102341] hover:bg-[#1d3d68] text-white text-xs font-bold transition-colors"
            >
              <span>Open Watchlist</span>
              <span>↗</span>
            </SiteLink>
          </div>
        </div>

        {/* Module 4: Institutional Recruiting Records */}
        <div className="bg-white rounded-2xl p-6 border border-purple-200/80 bg-purple-50/20 shadow-2xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700">
              <ClipboardList className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#102341]">Recruiting Records</h3>
            <p className="text-xs text-[#65748a] leading-relaxed">
              Manage touchpoint logs, scholarship offers, verbal/NLI commitments, and private scouting notes.
            </p>
          </div>
          <div className="pt-2">
            <SiteLink
              href="/portal/records"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-purple-900 hover:bg-purple-950 text-white text-xs font-bold transition-colors"
            >
              <span>Manage Records</span>
              <span>↗</span>
            </SiteLink>
          </div>
        </div>
      </div>

      {/* Security Architecture Reminder Card */}
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
