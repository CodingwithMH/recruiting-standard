"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  ShieldCheck,
  Users,
  Search,
  BookmarkCheck,
  CreditCard,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import SiteLink from "@/components/ui/SiteLink";
import { getStoredUser } from "@/lib/auth";
import type { UserProfile } from "@/lib/api";

export default function SchoolDashboardPage() {
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    setUser(getStoredUser());
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

      {/* Quick Action / Module Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Module 1: Institutional Roster */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-[#102341]">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#102341]">Coaching Staff Roster</h3>
            <p className="text-xs text-[#65748a] leading-relaxed">
              Manage authorized school staff, athletic directors, and recruiting coordinators with
              role-based permissions.
            </p>
          </div>
          <div className="pt-2">
            <span className="text-xs font-bold text-blue-600 inline-flex items-center gap-1">
              Active in Step 2.6 ↗
            </span>
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
              position, and academic metrics.
            </p>
          </div>
          <div className="pt-2">
            <span className="text-xs font-bold text-slate-500 inline-flex items-center gap-1">
              Milestone 4 (Gated Engine)
            </span>
          </div>
        </div>

        {/* Module 3: Private Recruiting Records */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-[#102341]">
              <BookmarkCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#102341]">Private Watchlists & Notes</h3>
            <p className="text-xs text-[#65748a] leading-relaxed">
              Maintain school-isolated prospect shortlists, evaluations, and contact logs that are
              never visible to rival institutions.
            </p>
          </div>
          <div className="pt-2">
            <span className="text-xs font-bold text-slate-500 inline-flex items-center gap-1">
              Milestone 4 (Data Isolated)
            </span>
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
