export default function Intro() {
  return (
    <section className="py-20 px-[6%] bg-white">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
        <div className="lg:col-span-7">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-[#102341] text-xs font-semibold uppercase tracking-wider mb-3">
            <span>The Right Connection Changes Everything</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-[#102341] tracking-tight leading-tight">
            There&apos;s talent everywhere. <br />
            <span className="text-[#65748a] font-normal">Let&apos;s make it easier to find.</span>
          </h2>
        </div>
        <p className="lg:col-span-5 text-sm sm:text-base text-[#65748a] leading-relaxed">
          Recruiting should be about finding the right fit. We bring athletes, coaches, and schools
          together in one focused space, so potential can become a plan.
        </p>
      </div>
    </section>
  );
}
