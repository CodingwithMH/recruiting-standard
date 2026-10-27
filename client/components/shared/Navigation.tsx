"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X, ArrowUpRight } from "lucide-react";
import SiteLink from "@/components/ui/SiteLink";

const navLinks: [string, string][] = [
  ["/", "Home"],
  ["/about", "About"],
  ["/features", "How it works"],
  ["/pricing", "Pricing"],
  ["/contact", "Contact"],
];

export default function Navigation() {
  const [open, setOpen] = useState(false);
  const path = usePathname();

  return (
    <header className="h-20 sm:h-24 px-[6%] flex items-center justify-between border-b border-slate-200/80 bg-white sticky top-0 z-50">
      {/* Brand */}
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

      {/* Mobile toggle button */}
      <button
        className="sm:hidden p-2 rounded-lg border border-slate-200 text-[#102341] hover:bg-slate-50 transition-colors"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label="Toggle navigation"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Desktop Navigation */}
      <nav className="hidden sm:flex items-center gap-7 text-xs sm:text-sm font-semibold text-[#102341]" aria-label="Main navigation">
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
        <SiteLink
          href="/login"
          className="text-slate-600 hover:text-[#102341] transition-colors ml-2"
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
      </nav>

      {/* Mobile drawer */}
      {open && (
        <div className="sm:hidden absolute top-20 left-0 right-0 bg-white border-b border-slate-200 p-6 flex flex-col gap-4 shadow-xl z-50">
          {navLinks.map(([href, label]) => (
            <SiteLink
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={`text-sm font-semibold py-1.5 ${
                path === href ? "text-blue-700" : "text-slate-700"
              }`}
            >
              {label}
            </SiteLink>
          ))}
          <div className="pt-3 border-t border-slate-100 flex flex-col gap-3">
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
          </div>
        </div>
      )}
    </header>
  );
}
