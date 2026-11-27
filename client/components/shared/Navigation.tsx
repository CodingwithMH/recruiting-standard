"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, ArrowUpRight } from "lucide-react";
import SiteLink from "@/components/ui/SiteLink";
import type { UserProfile } from "@/lib/api";
import { getRoleHomePath, getStoredUser, isAuthenticated } from "@/lib/auth";

const navLinks: [string, string][] = [
  ["/", "Home"],
  ["/about", "About"],
  ["/features", "How it works"],
  ["/pricing", "Pricing"],
  ["/contact", "Contact"],
];

const AUTH_PAGES = ["/login", "/signup", "/school-registration"];

export default function Navigation() {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<{
    ready: boolean;
    authenticated: boolean;
    user: UserProfile | null;
  }>({ ready: false, authenticated: false, user: null });

  useEffect(() => {
    const syncSession = () => {
      const authenticated = isAuthenticated();
      const user = authenticated ? getStoredUser() : null;

      setSession({ ready: true, authenticated, user });

      if (authenticated && path && AUTH_PAGES.includes(path)) {
        router.replace(getRoleHomePath(user?.globalRole));
      }
    };

    syncSession();
    window.addEventListener("storage", syncSession);
    window.addEventListener("focus", syncSession);

    return () => {
      window.removeEventListener("storage", syncSession);
      window.removeEventListener("focus", syncSession);
    };
  }, [path, router]);

  const dashboardHref = getRoleHomePath(session.user?.globalRole);

  return (
    <header className="h-20 lg:h-24 px-[6%] flex items-center justify-between border-b border-slate-200/80 bg-white sticky top-0 z-50">
      <SiteLink
        href="/"
        className="flex items-center gap-2.5 text-[#102341]"
        aria-label="MVP 4.18 - The Recruiting Standard home"
      >
        <span className="text-2xl sm:text-3xl font-black tracking-tighter text-[#102341]">
          MVP<span className="text-blue-600 text-lg">↗</span>
        </span>
        <span className="leading-tight">
          <span className="block text-xs sm:text-sm font-black tracking-wider text-[#102341]">
            MVP 4.18
          </span>
          <span className="block text-[9px] sm:text-[10px] font-bold tracking-wider uppercase text-slate-500">
            THE RECRUITING STANDARD
          </span>
        </span>
      </SiteLink>

      <button
        type="button"
        className="lg:hidden p-2 rounded-lg border border-slate-200 text-[#102341] hover:bg-slate-50 transition-colors"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls="mobile-navigation"
        aria-label={open ? "Close navigation menu" : "Open navigation menu"}
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      <nav
        className="hidden lg:flex items-center gap-6 xl:gap-7 text-xs xl:text-sm font-semibold text-[#102341]"
        aria-label="Main navigation"
      >
        {navLinks.map(([href, label]) => {
          const isActive = path === href;
          return (
            <SiteLink
              key={href}
              href={href}
              className={`transition-colors py-1 ${
                isActive
                  ? "text-blue-700 border-b-2 border-blue-600"
                  : "text-slate-600 hover:text-[#102341]"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              {label}
            </SiteLink>
          );
        })}
        {session.ready &&
          (session.authenticated ? (
            <SiteLink
              href={dashboardHref}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#102341] text-white hover:bg-[#1d3d68] transition-colors text-xs font-bold shadow-sm ml-1"
            >
              <span>Dashboard</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-[#bed8ff]" />
            </SiteLink>
          ) : (
            <>
              <SiteLink
                href="/signup"
                className="text-slate-600 hover:text-[#102341] transition-colors ml-1"
              >
                Sign up
              </SiteLink>
              <SiteLink
                href="/login"
                className="text-slate-600 hover:text-[#102341] transition-colors"
              >
                Log in ↗
              </SiteLink>
              <SiteLink
                href="/school-registration"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#102341] text-white hover:bg-[#1d3d68] transition-colors text-xs font-bold shadow-sm"
              >
                <span>For Schools</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-[#bed8ff]" />
              </SiteLink>
            </>
          ))}
      </nav>

      {open && (
        <nav
          id="mobile-navigation"
          aria-label="Mobile navigation"
          className="lg:hidden absolute top-20 left-0 right-0 bg-white border-b border-slate-200 p-6 flex flex-col gap-4 shadow-xl z-50 max-h-[calc(100vh-5rem)] overflow-y-auto"
        >
          {navLinks.map(([href, label]) => (
            <SiteLink
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              aria-current={path === href ? "page" : undefined}
              className={`text-sm font-semibold py-1.5 ${
                path === href ? "text-blue-700" : "text-slate-700"
              }`}
            >
              {label}
            </SiteLink>
          ))}
          <div className="pt-3 border-t border-slate-100 flex flex-col gap-3">
            {session.ready &&
              (session.authenticated ? (
                <SiteLink
                  href={dashboardHref}
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full bg-[#102341] text-white text-xs font-bold"
                >
                  <span>Dashboard</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-[#bed8ff]" />
                </SiteLink>
              ) : (
                <>
                  <SiteLink
                    href="/signup"
                    onClick={() => setOpen(false)}
                    className="text-sm font-semibold text-slate-700"
                  >
                    Create athlete / parent account
                  </SiteLink>
                  <SiteLink
                    href="/login"
                    onClick={() => setOpen(false)}
                    className="text-sm font-semibold text-slate-700"
                  >
                    Log in ↗
                  </SiteLink>
                  <SiteLink
                    href="/school-registration"
                    onClick={() => setOpen(false)}
                    className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full bg-[#102341] text-white text-xs font-bold"
                  >
                    <span>For Schools</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-[#bed8ff]" />
                  </SiteLink>
                </>
              ))}
          </div>
        </nav>
      )}
    </header>
  );
}
