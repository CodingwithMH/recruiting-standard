"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  LogOut,
  ShieldCheck,
  User,
} from "lucide-react";
import SiteLink from "@/components/ui/SiteLink";
import { getStoredUser, endSession, isAuthenticated } from "@/lib/auth";
import type { UserProfile } from "@/lib/api";

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    const current = getStoredUser();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser(current);
    setLoading(false);
  }, [router]);

  const handleSignOut = () => {
    endSession();
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f7fc] flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-[#102341] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-[#65748a] tracking-wide">
            Loading Recruiting Portal...
          </p>
        </div>
      </div>
    );
  }

  const primaryMembership = user?.memberships?.[0];
  const schoolName = primaryMembership?.school.name || "School Portal";
  const schoolId = primaryMembership?.school.schoolId;
  const schoolStatus = primaryMembership?.school.status;
  const isSchoolBlocked =
    user?.globalRole === "SCHOOL_STAFF" &&
    !!schoolStatus &&
    schoolStatus !== "APPROVED";

  if (isSchoolBlocked) {
    return (
      <div className="min-h-screen bg-[#f4f7fc] flex items-center justify-center p-6">
        <div className="bg-white max-w-md w-full rounded-2xl border border-amber-200 p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-[#102341]">
            Portal Access Unavailable
          </h1>
          <p className="text-xs text-[#65748a] leading-relaxed">
            {schoolStatus === "PENDING" &&
              "Your school registration is awaiting Platform Admin approval."}
            {schoolStatus === "SUSPENDED" &&
              "Your school's portal access has been suspended. Please contact institutional support."}
            {schoolStatus === "REJECTED" &&
              "Your school registration was not approved. Please contact institutional support."}
          </p>
          <button
            onClick={handleSignOut}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#102341] hover:bg-[#1b3556] text-white text-xs font-bold cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f7fc] flex flex-col">
      {/* Top Navigation Bar */}
      <header className="h-16 sm:h-20 px-[5%] bg-white border-b border-slate-200/90 flex items-center justify-between sticky top-0 z-40">
        {/* Brand & School context */}
        <div className="flex items-center gap-4">
          <SiteLink href="/portal/dashboard" className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl font-black tracking-tighter text-[#102341]">
              MVP<span className="text-blue-600 text-sm">↗</span>
            </span>
            <span className="hidden sm:inline-block border-l border-slate-200 pl-3">
              <span className="block text-xs font-bold text-[#102341] truncate max-w-[200px]">
                {schoolName}
              </span>
              <span className="block text-[9px] font-mono text-slate-500 font-semibold tracking-wider">
                {schoolId || "PORTAL"}
              </span>
            </span>
          </SiteLink>
        </div>

        {/* User profile & Sign out */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200/80">
            <User className="w-3.5 h-3.5 text-[#102341]" />
            <span className="text-xs font-semibold text-[#102341]">
              {user?.firstName} {user?.lastName}
            </span>
            <span className="text-[10px] uppercase font-bold text-blue-600 tracking-wider">
              {primaryMembership?.role?.replace("_", " ") || user?.globalRole}
            </span>
          </div>

          {primaryMembership && (
            <SiteLink
              href="/portal/school"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-[#102341] transition-colors text-xs font-semibold"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">School Settings</span>
            </SiteLink>
          )}

          <button
            onClick={handleSignOut}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-[#102341] transition-colors text-xs font-semibold cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 px-[5%] py-8 max-w-7xl mx-auto w-full">
        {children}
      </main>

      {/* Portal Footer */}
      <footer className="px-[5%] py-4 bg-white border-t border-slate-200/80 text-center text-xs text-[#65748a]">
        The Recruiting Standard MVP 4.18 · Institutional Data Isolation Enforced
      </footer>
    </div>
  );
}
