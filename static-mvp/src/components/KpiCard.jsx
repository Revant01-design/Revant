export default function KpiCard({ label, value, sub, icon: Icon, accent, testid }) {
  return (
    <div
      data-testid={testid}
      className="bg-white border border-slate-200 rounded-md p-6 lift-hover"
    >
      <div className="flex items-start justify-between mb-6">
        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 font-semibold">{label}</p>
        <div className={`w-9 h-9 rounded-md flex items-center justify-center ${accent ? "bg-[#0A1A2F]" : "bg-slate-50"}`}>
          <Icon className={`w-4 h-4 ${accent ? "text-[#C9B37E]" : "text-[#0A1A2F]"}`} />
        </div>
      </div>
      <p className="font-display text-3xl xl:text-4xl font-light tracking-tight text-[#0A1A2F]">
        {value}
      </p>
      {sub && <p className="mt-2 text-sm text-slate-500">{sub}</p>}
    </div>
  );
}
