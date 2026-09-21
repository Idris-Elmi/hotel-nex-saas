type Props = { label: string; value: string; sublabel?: string; accent?: string };

export default function KpiCard({ label, value, sublabel, accent }: Props) {
  return (
    <div className="relative group bg-white dark:bg-[#0F1629]/80 backdrop-blur-sm border border-slate-200/80 dark:border-[#1E2D4A]/60 rounded-2xl p-5 shadow-sm hover:shadow-lg transition-all duration-300">
      <div className={`absolute top-0 left-0 w-full h-0.5 rounded-t-2xl ${accent ?? "bg-gradient-to-r from-indigo-500 to-purple-500"}`} />
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{value}</p>
      {sublabel && <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{sublabel}</p>}
    </div>
  );
}
