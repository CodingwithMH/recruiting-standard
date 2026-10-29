"use client";

import { useEffect, useState } from "react";
import { GraduationCap, FileText, CheckCircle, Clock } from "lucide-react";
import { getStoredUser } from "@/lib/auth";
import type { UserProfile } from "@/lib/api";

export default function AthletePortalPage() {
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

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
          Manage your verified athletic profile, upload academic transcripts, and track recruiting milestones.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-[#102341]">
            <FileText className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-[#102341]">Academic & Document Verification</h3>
          <p className="text-xs text-[#65748a] leading-relaxed">
            Transcripts, combine reports, and eligibility documents are stored in private cloud storage
            and reviewed by platform administrators before coach discovery is unlocked.
          </p>
          <div className="pt-2">
            <span className="text-xs font-bold text-slate-500">
              Active in Milestone 3 (Document Queue)
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-[#102341]">
            <Clock className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-[#102341]">Profile Verification Status</h3>
          <p className="text-xs text-[#65748a] leading-relaxed">
            Your profile verification indicator guides college recruiters on the authenticity of your
            academic transcripts and athletic metrics.
          </p>
          <div className="pt-2">
            <span className="text-xs font-bold text-slate-500">
              Active in Milestone 3 (Profile Builder)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
