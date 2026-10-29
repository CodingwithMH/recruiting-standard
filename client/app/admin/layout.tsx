"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldAlert,
  LogOut,
  User,
  Building2,
  FileCheck2,
  Layers,
} from "lucide-react";
import SiteLink from "@/components/ui/SiteLink";
import { getStoredUser, endSession, isAuthenticated } from "@/lib/auth";
import type { UserProfile } from "@/lib/api";

export default function AdminLayout({
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
    if (current && current.globalRole !== "PLATFORM_ADMIN") {
      router.push("/portal/dashboard");
      return;
    }
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
            Verifying Platform Admin Credentials...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f7fc] flex flex-col">
      {/* Top Admin Header */}
      <header className="h-16 sm:h-20 px-[5%] bg-[#102341] text-white flex items-center justify-between sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-4">
          <SiteLink href="/admin/dashboard" className="flex items-center gap-2.5">
            <span className="text-xl sm:text-2xl font-black tracking-tighter text-white">
              MVP<span className="text-blue-400 text-sm">↗</span>
            </span>
            <div className="border-l border-slate-700 pl-3">
              <span className="block text-xs font-bold text-white tracking-wide">
                PLATFORM ADMINISTRATION
              </span>
              <span className="block text-[9px] font-mono text-blue-300 font-semibold tracking-wider">
                ROOT SYSTEM PRIVILEGES
              </span>
            </div>
          </SiteLink>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700">
            <User className="w-3.5 h-3.5 text-blue-300" />
            <span className="text-xs font-semibold text-white">
              {user?.firstName} {user?.lastName}
            </span>
            <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
              SUPERADMIN
            </span>
          </div>

          <button
            onClick={handleSignOut}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-white transition-colors text-xs font-semibold cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Admin Content */}
      <main className="flex-1 px-[5%] py-8 max-w-7xl mx-auto w-full">
        {children}
      </main>

      {/* Admin Footer */}
      <footer className="px-[5%] py-4 bg-white border-t border-slate-200/80 text-center text-xs text-[#65748a]">
        The Recruiting Standard MVP 4.18 · Platform Administration Console
      </footer>
    </div>
  );
}
