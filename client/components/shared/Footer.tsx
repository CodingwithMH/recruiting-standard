import { ArrowUpRight } from "lucide-react";
import SiteLink from "@/components/ui/SiteLink";

export default function Footer() {
  return (
    <footer className="bg-[#102341] text-white py-16 px-[6%]">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 pb-12 border-b border-white/10">
          <SiteLink
            className="flex items-center gap-2.5 text-white"
            href="/"
            aria-label="MVP 4.18 - The Recruiting Standard home"
          >
            <span className="text-3xl font-black tracking-tighter text-white">
              MVP<span className="text-[#bed8ff] text-lg">↗</span>
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-black tracking-wider text-white">
                MVP 4.18
              </span>
              <span className="block text-[10px] font-bold tracking-wider uppercase text-[#bed8ff]">
                The Recruiting Standard
              </span>
            </span>
          </SiteLink>

          <p className="text-lg sm:text-xl text-slate-300 font-normal leading-snug max-w-md">
            Potential deserves a pathway. <br />
            <span className="text-white font-medium">Let&apos;s build yours.</span>
          </p>

          <SiteLink
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#bed8ff] text-[#102341] font-bold text-xs sm:text-sm hover:bg-white transition-all shrink-0"
            href="/school-registration"
          >
            <span>Register your school</span>
            <ArrowUpRight className="w-4 h-4" />
          </SiteLink>
        </div>

        <div className="pt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 text-xs text-slate-400">
          <span>© 2026 MVP 4.18. All rights reserved.</span>
          <div className="flex flex-wrap gap-6 text-slate-300 font-medium">
            <SiteLink href="/about" className="hover:text-white transition-colors">
              About
            </SiteLink>
            <SiteLink href="/features" className="hover:text-white transition-colors">
              How It Works
            </SiteLink>
            <SiteLink href="/pricing" className="hover:text-white transition-colors">
              Pricing
            </SiteLink>
            <SiteLink href="/contact" className="hover:text-white transition-colors">
              Contact
            </SiteLink>
            <SiteLink href="/privacy-policy" className="hover:text-white transition-colors">
              Privacy Policy
            </SiteLink>
            <SiteLink href="/terms" className="hover:text-white transition-colors">
              Terms
            </SiteLink>
          </div>
          <span className="text-[10px] tracking-widest font-mono uppercase text-slate-500">
            MADE FOR THE NEXT GENERATION
          </span>
        </div>
      </div>
    </footer>
  );
}
