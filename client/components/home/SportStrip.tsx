export default function SportStrip() {
  return (
    <section className="bg-[#102341] text-slate-200 py-6 px-[6%] flex flex-wrap items-center gap-6 overflow-hidden border-b border-slate-800">
      <span className="text-[10px] text-slate-400 font-mono tracking-widest uppercase shrink-0">
        EVERY SPORT. SAME AMBITION.
      </span>
      <div className="flex flex-wrap items-center gap-6 text-xs sm:text-sm font-bold tracking-wider text-slate-100">
        <span>SOCCER</span>
        <span className="text-[#bed8ff]">✳</span>
        <span>BASKETBALL</span>
        <span className="text-[#bed8ff]">✳</span>
        <span>TRACK &amp; FIELD</span>
        <span className="text-[#bed8ff]">✳</span>
        <span>VOLLEYBALL</span>
        <span className="text-[#bed8ff]">✳</span>
        <span>FOOTBALL</span>
        <span className="text-[#bed8ff]">✳</span>
        <span className="text-slate-400">MORE POSSIBILITIES</span>
      </div>
    </section>
  );
}
