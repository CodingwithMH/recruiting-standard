"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  BookmarkCheck,
  Building2,
  ClipboardList,
  GraduationCap,
  LogOut,
  Search,
  ShieldCheck,
  User,
} from "lucide-react";
import SiteLink from "@/components/ui/SiteLink";
import {
  endSession,
  getStoredUser,
  setStoredUser,
  signOut,
  isAuthenticated,
} from "@/lib/auth";
import { apiRequest } from "@/lib/api";
import type { UserProfile } from "@/lib/api";

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }

    const cached = getStoredUser();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser(cached);

    const verifySession = async () => {
      // Re-validate against the server on every portal entry so direct links
      // cannot bypass pending/rejected/suspended account restrictions.
      const res = await apiRequest<UserProfile>("auth/me");

      if (cancelled) return;

      if (!res.success || !res.data) {
        endSession();
        router.replace("/login");
        return;
      }

      setStoredUser(res.data);
      setUser(res.data);
      setLoading(false);
    };

    void verifySession();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleSignOut = async () => {
    await signOut();
    window.location.replace("/login");
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
  const isUserBlocked = !!user && user.status !== "ACTIVE";
  const isSchoolBlocked =
    user?.globalRole === "SCHOOL_STAFF" &&
    !!schoolStatus &&
    schoolStatus !== "APPROVED";

  if (isUserBlocked || isSchoolBlocked) {
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
            {user?.status === "PENDING" &&
              "Your student-athlete account is awaiting school approval. Portal access unlocks after your school verifies you."}
            {user?.status === "INACTIVE" &&
              "Your account is inactive and cannot access the recruiting portal. Please contact your school administrator."}
            {user?.status === "SUSPENDED" &&
              "Your account has been suspended and cannot access the recruiting portal. Please contact institutional support."}
            {!isUserBlocked && schoolStatus === "PENDING" &&
              "Your school registration is awaiting Platform Admin approval."}
            {!isUserBlocked && schoolStatus === "SUSPENDED" &&
              "Your school's portal access has been suspended. Please contact institutional support."}
            {!isUserBlocked && schoolStatus === "REJECTED" &&
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

  const isSchoolAdmin = primaryMembership?.role === "SCHOOL_ADMIN";

  const navLinks = [
    {
      href: "/portal/search",
      label: "Talent Search",
      icon: Search,
    },
    {
      href: "/portal/prospects",
      label: "Prospects",
      icon: BookmarkCheck,
    },
    {
      href: "/portal/records",
      label: "Recruiting Records",
      icon: ClipboardList,
    },
    ...(isSchoolAdmin
      ? [
          {
            href: "/portal/athletes",
            label: "Athlete Roster",
            icon: GraduationCap,
          },
          {
            href: "/portal/school",
            label: "School Settings",
            icon: Building2,
          },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen bg-[#f4f7fc] flex flex-col">
      {/* Top Navigation Bar */}
      <header className="h-16 px-4 sm:px-6 lg:px-8 bg-white border-b border-slate-200/90 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto w-full h-full flex items-center justify-between gap-3 sm:gap-4">
          {/* Brand & School context */}
          <div className="flex items-center gap-3 shrink-0">
            <SiteLink href="/portal/dashboard" className="flex items-center gap-2.5 group">
              <span className="text-xl font-black tracking-tight text-[#102341] group-hover:text-blue-600 transition-colors">
                MVP<span className="text-blue-600 text-sm">↗</span>
              </span>
              <span className="hidden sm:inline-block border-l border-slate-200 pl-2.5">
                <span className="block text-xs font-bold text-[#102341] truncate max-w-[130px] md:max-w-[180px] whitespace-nowrap">
                  {schoolName}
                </span>
                <span className="block text-[9px] font-mono text-slate-500 font-semibold tracking-wider whitespace-nowrap">
                  {schoolId || "PORTAL"}
                </span>
              </span>
            </SiteLink>
          </div>

          {/* Navigation Links */}
          {primaryMembership && (
            <nav className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden py-1">
              {navLinks.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/portal/dashboard" &&
                    pathname?.startsWith(item.href + "/"));
                return (
                  <SiteLink
                    key={item.href}
                    href={item.href}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors shrink-0 ${
                      active
                        ? "bg-[#102341] text-white shadow-xs font-bold"
                        : "text-slate-600 hover:text-[#102341] hover:bg-slate-100"
                    }`}
                  >
                    <item.icon
                      className={`w-3.5 h-3.5 ${
                        active ? "text-blue-300" : "text-slate-500"
                      }`}
                    />
                    <span className="whitespace-nowrap">{item.label}</span>
                  </SiteLink>
                );
              })}
            </nav>
          )}

          {/* User profile & Sign out */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200/80">
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 font-bold text-[11px] flex items-center justify-center shrink-0">
                {user?.firstName?.[0] || "U"}
              </div>
              <div className="text-left leading-tight">
                <span className="block text-xs font-bold text-[#102341] whitespace-nowrap">
                  {user?.firstName} {user?.lastName}
                </span>
                <span className="block text-[9px] uppercase font-bold text-blue-600 font-mono tracking-wider whitespace-nowrap">
                  {primaryMembership?.role?.replace("_", " ") || user?.globalRole}
                </span>
              </div>
            </div>

            <button
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 bg-white hover:bg-red-50 hover:text-red-700 hover:border-red-200 text-[#102341] text-xs font-semibold whitespace-nowrap transition cursor-pointer shrink-0"
              title="Sign out of portal"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline whitespace-nowrap">Sign Out</span>
            </button>
          </div>
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
