import { ArrowLeft, List } from "lucide-react";
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
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold uppercase tracking-wider">
              Effective {legalDocument.effectiveDate}
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-semibold text-[#102341] tracking-tight leading-tight mb-3">
            {legalDocument.heading}
          </h1>
          <p className="text-sm sm:text-base text-[#65748a] leading-relaxed mb-3 max-w-2xl">
            {legalDocument.intro}
          </p>
        </div>
      </section>

      <section className="py-16 px-[6%] bg-white">
        <div className="max-w-5xl mx-auto">
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
                  <div className="space-y-3">
                    {section.paragraphs.map((paragraph) => (
                      <p
                        key={paragraph}
                        className="text-sm text-[#65748a] leading-relaxed m-0"
                      >
                        {paragraph}
                      </p>
                    ))}
                    {section.bullets && (
                      <ul className="list-disc pl-5 space-y-2 text-sm text-[#65748a] leading-relaxed">
                        {section.bullets.map((bullet) => (
                          <li key={bullet}>{bullet}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </section>
              ))}
            </article>
          </div>
        </div>
      </section>
    </>
  );
}
