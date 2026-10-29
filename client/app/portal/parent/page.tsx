"use client";

import { useEffect, useState } from "react";
import { Users, ShieldCheck, HeartHandshake } from "lucide-react";
import { getStoredUser } from "@/lib/auth";
import type { UserProfile } from "@/lib/api";

export default function ParentPortalPage() {
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

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
          Oversee linked student-athlete recruiting profiles, document submissions, and institutional outreach.
        </p>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs space-y-3">
        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-[#102341]">
          <ShieldCheck className="w-5 h-5 text-blue-600" />
        </div>
        <h3 className="text-base font-bold text-[#102341]">Minor Athlete Safety & Privacy Controls</h3>
        <p className="text-xs text-[#65748a] leading-relaxed">
          In compliance with student privacy regulations, parents maintain oversight over recruitment
          communications and transcript authorizations.
        </p>
        <div className="pt-2">
          <span className="text-xs font-bold text-slate-500">
            Active in Milestone 3 & 4
          </span>
        </div>
      </div>
    </div>
  );
}
