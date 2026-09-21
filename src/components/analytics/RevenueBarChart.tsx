import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { formatAxisTick, formatCurrency } from "@/lib/utils/format";
import ChartCard from "./ChartCard";
import ChartSkeleton from "./ChartSkeleton";

type RevenueData = { month: string; year: number; revenue: number; bookings: number };
type Props = { data: RevenueData[]; loading: boolean; error?: string | null };

function TooltipContent({ active, payload }: { active?: boolean; payload?: { payload: RevenueData; value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white dark:bg-[#1A2540] border border-slate-200 dark:border-[#252D47] rounded-xl shadow-xl px-4 py-3 text-xs">
      <p className="text-slate-500 dark:text-slate-400 mb-2 font-medium">{d.month} {d.year}</p>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-[#6366F1] shrink-0" />
        <span className="text-slate-700 dark:text-slate-300">Revenue</span>
        <span className="ml-auto font-bold text-slate-900 dark:text-slate-100">
          {formatCurrency(d.revenue)}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-[#14B8A6] shrink-0" />
        <span className="text-slate-700 dark:text-slate-300">Bookings</span>
        <span className="ml-auto font-bold text-slate-900 dark:text-slate-100">{d.bookings}</span>
      </div>
    </div>
  );
}

export default function RevenueBarChart({ data, loading, error }: Props) {
  return (
    <ChartCard title="Monthly Revenue">
      {error ? (
        <div className="h-64 flex items-center justify-center text-sm text-red-400">Failed to load revenue data.</div>
      ) : loading ? (
        <ChartSkeleton />
      ) : !data.length ? (
        <div className="h-64 flex items-center justify-center text-sm text-slate-400 dark:text-slate-600">No revenue data available.</div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ left: 0, right: 0, top: 8, bottom: 8 }}>
            <defs>
              <linearGradient id="revBarGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#818CF8" />
                <stop offset="100%" stopColor="#6366F1" />
              </linearGradient>
              <linearGradient id="revBkgGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#14B8A6" />
                <stop offset="100%" stopColor="#0D9488" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12, fill: '#94A3B8', fontWeight: 500 }}
              tickLine={false}
              axisLine={{ stroke: 'rgba(148,163,184,0.15)', strokeWidth: 1 }}
              interval={0}
            />
            <YAxis
              tickFormatter={formatAxisTick}
              tick={{ fontSize: 11, fill: '#94A3B8' }}
              axisLine={false}
              tickLine={false}
              width={50}
            />
            <Tooltip content={<TooltipContent />} cursor={{ fill: 'rgba(99,102,241,0.06)' }} />
            <Bar
              dataKey="revenue"
              fill="url(#revBarGrad)"
              radius={[6, 6, 0, 0]}
              maxBarSize={44}
              barSize={36}
              isAnimationActive
              animationDuration={800}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}