import { formatCurrency } from "@/lib/utils/format";

type Props = { active?: boolean; payload?: { name: string; value: number; color?: string }[]; label?: string };

export default function ChartTooltip({ active, payload, label }: Props) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-[#1A2540] border border-slate-200 dark:border-[#252D47] rounded-xl shadow-xl px-4 py-3 text-xs">
      {label && <p className="text-slate-500 dark:text-slate-400 mb-2 font-medium">{label}</p>}
      {payload.map((entry, idx) => (
        <div key={idx} className="flex items-center gap-2 mb-1 last:mb-0">
          {entry.color && <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />}
          <span className="text-slate-700 dark:text-slate-300">{entry.name}</span>
          <span className="ml-auto font-bold text-slate-900 dark:text-slate-100">{formatCurrency(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}
