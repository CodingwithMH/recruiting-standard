import { AlertCircle, ArrowLeft, List } from "lucide-react";
import SiteLink from "@/components/ui/SiteLink";
import type { LegalDocument } from "@/lib/legal-content";

export default function LegalPage({
  legalDocument,
}: {
  legalDocument: LegalDocument;
}) {
  return (
    <>
      <section className="py-16 sm:py-20 px-[6%] bg-[#f4f7fc] border-b border-slate-200/80">
        <div className="max-w-5xl mx-auto">
          <div className="mb-6">
            <SiteLink
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-[#102341] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to home</span>
            </SiteLink>
          </div>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200 text-[#102341] text-xs font-semibold uppercase tracking-wider">
              <span>{legalDocument.eyebrow}</span>
            </div>
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold uppercase tracking-wider">
              {legalDocument.status}
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-semibold text-[#102341] tracking-tight leading-tight mb-3">
            {legalDocument.heading}
          </h1>
          <p className="text-sm sm:text-base text-[#65748a] leading-relaxed mb-3 max-w-2xl">
            {legalDocument.intro}
          </p>
          <p className="text-xs text-slate-500 font-mono">{legalDocument.lastUpdated}</p>
        </div>
      </section>

      <section className="py-16 px-[6%] bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="p-5 rounded-2xl bg-blue-50/70 border border-blue-200/80 flex items-start gap-3 mb-12">
            <AlertCircle className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm text-blue-900 leading-relaxed">
              <strong>{legalDocument.draftNotice.split(".")[0]}.</strong>
              {legalDocument.draftNotice.slice(legalDocument.draftNotice.indexOf(".") + 1)}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            <nav
              aria-label={`${legalDocument.eyebrow} sections`}
              className="lg:col-span-3 lg:sticky lg:top-28"
            >
              <div className="rounded-2xl border border-slate-200/80 bg-[#f8fafc] p-5">
                <span className="flex items-center gap-2 text-[10px] font-bold tracking-widest text-[#65748a] uppercase font-mono mb-4">
                  <List className="w-3.5 h-3.5" />
                  On this page
                </span>
                <ul className="space-y-2.5">
                  {legalDocument.sections.map((section) => (
                    <li key={section.id}>
                      <a
                        href={`#${section.id}`}
                        className="text-xs text-slate-600 leading-snug hover:text-[#102341] transition-colors"
                      >
                        {section.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </nav>

            <article className="lg:col-span-9 space-y-10">
              {legalDocument.sections.map((section) => (
                <section
                  key={section.id}
                  id={section.id}
                  aria-labelledby={`${section.id}-heading`}
                  className="scroll-mt-28 pb-8 border-b border-slate-100 last:border-b-0"
                >
                  <h2
                    id={`${section.id}-heading`}
                    className="text-xl font-bold text-[#102341] mb-3"
                  >
                    {section.title}
                  </h2>
                  <p className="text-sm text-[#65748a] leading-relaxed m-0">{section.body}</p>
                </section>
              ))}
            </article>
          </div>
        </div>
      </section>
    </>
  );
}
