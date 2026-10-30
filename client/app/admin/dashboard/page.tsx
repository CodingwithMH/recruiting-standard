"use client";

import { useEffect, useState } from "react";
import {
  ShieldAlert,
  FileCheck,
  CreditCard,
  Clock,
} from "lucide-react";
import SchoolApprovalQueue from "@/components/admin/SchoolApprovalQueue";
import { getStoredUser } from "@/lib/auth";
import type { UserProfile } from "@/lib/api";

export default function AdminDashboardPage() {
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser(getStoredUser());
  }, []);

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 border border-red-200/80 text-red-900 text-xs font-semibold uppercase tracking-wider mb-3">
            <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
            <span>Platform Administrator Authority</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#102341]">
            Platform Overview & Queues
          </h1>
          <p className="text-xs sm:text-sm text-[#65748a] mt-1 leading-relaxed">
            Logged in as <strong className="text-[#102341]">{user?.email}</strong>. Review institutional
            applications, assign permanent School IDs, and verify athlete academic credentials.
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

      <SchoolApprovalQueue />

      {/* Admin Action Queues */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Queue 1: School Approval Queue */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#102341]">School Verification Queue</h3>
            <p className="text-xs text-[#65748a] leading-relaxed">
              Review pending institutional registrations, verify athletic director credentials, and
              allocate permanent immutable School IDs (SCH-XXXXX).
            </p>
          </div>
          <div className="pt-2">
            <span className="text-xs font-bold text-blue-600 inline-flex items-center gap-1">
              Live in the queue above ↗
            </span>
          </div>
        </div>

        {/* Queue 2: Athlete Document Review Queue */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <FileCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#102341]">Transcript & Document Review</h3>
            <p className="text-xs text-[#65748a] leading-relaxed">
              Verify official high school transcripts and NCAA/NAIA eligibility documents via private
              cloud storage signed URLs.
            </p>
          </div>
          <div className="pt-2">
            <span className="text-xs font-bold text-slate-500">
              Milestone 3 (Private Storage)
            </span>
          </div>
        </div>

        {/* Queue 3: Subscription Management */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#102341]">School Subscriptions</h3>
            <p className="text-xs text-[#65748a] leading-relaxed">
              Manually record payments for annual ($1,500/yr) and monthly ($250/mo) school access plans
              and manage institution billing status.
            </p>
          </div>
          <div className="pt-2">
            <span className="text-xs font-bold text-slate-500">
              Milestone 5 (Subscription Admin)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
