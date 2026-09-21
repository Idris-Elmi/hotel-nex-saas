"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import ChartCard from "./ChartCard";
import ChartSkeleton from "./ChartSkeleton";
import ChartEmpty from "./ChartEmpty";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Pending", color: "#F59E0B" },
  CONFIRMED: { label: "Confirmed", color: "#6366F1" },
  CHECKED_IN: { label: "Checked In", color: "#10B981" },
  CHECKED_OUT: { label: "Checked Out", color: "#94A3B8" },
  CANCELLED: { label: "Cancelled", color: "#EF4444" },
  NO_SHOW: { label: "No Show", color: "#8B5CF6" },
};

type Slice = { name: string; value: number; color: string };
type Props = { data: Record<string, number>; loading: boolean };

function CustomTooltipContent({ active, payload }: { active?: boolean; payload?: { name: string; value: number }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  const config = Object.entries(STATUS_CONFIG).find(([, c]) => c.label === d.name)?.[1];
  return (
    <div className="bg-white dark:bg-[#1A2540] border border-slate-200 dark:border-[#252D47] rounded-xl shadow-xl px-4 py-3 text-xs">
      <div className="flex items-center gap-2">
        {config && <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: config.color }} />}
        <span className="text-slate-700 dark:text-slate-300 font-medium">{d.name}</span>
        <span className="ml-auto font-bold text-slate-900 dark:text-slate-100">{d.value}</span>
      </div>
    </div>
  );
}

export default function BookingStatusDonut({ data, loading }: Props) {
  const slices: Slice[] = Object.entries(STATUS_CONFIG)
    .map(([k, config]) => ({ name: config.label, value: data[k] || 0, color: config.color }))
    .filter((s) => s.value > 0);

  const total = slices.reduce((s, d) => s + d.value, 0);

  return (
    <ChartCard title="Booking Status">
      {loading ? (
        <ChartSkeleton />
      ) : !total ? (
        <ChartEmpty />
      ) : (
        <div className="relative">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={slices}
                cx="50%"
                cy="50%"
                innerRadius="58%"
                outerRadius="78%"
                paddingAngle={3}
                dataKey="value"
                isAnimationActive
                animationDuration={800}
                startAngle={90}
                endAngle={-270}
              >
                {slices.map((s) => (
                  <Cell key={s.name} fill={s.color} stroke="rgba(0,0,0,0.1)" strokeWidth={1} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltipContent />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ top: 0, bottom: 10 }}>
            <span className="text-3xl font-bold text-slate-900 dark:text-slate-100">{total}</span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">Total</span>
          </div>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-2 px-2">
            {slices.map((s) => (
              <div key={s.name} className="flex items-center gap-1.5 text-xs">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                <span className="text-slate-600 dark:text-slate-400">{s.name}</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{((s.value / total) * 100).toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </ChartCard>
  );
}