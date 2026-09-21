"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { formatCurrency, formatAxisTick } from "@/lib/utils/format";
import ChartCard from "./ChartCard";
import ChartSkeleton from "./ChartSkeleton";
import ChartEmpty from "./ChartEmpty";

type RoomTypeData = { roomType: string; bookings: number; revenue: number };
type Props = { data: RoomTypeData[]; loading: boolean };

function TooltipContent({ active, payload }: { active?: boolean; payload?: { payload: RoomTypeData; value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white dark:bg-[#1A2540] border border-slate-200 dark:border-[#252D47] rounded-xl shadow-xl px-4 py-3 text-xs">
      <p className="text-slate-500 dark:text-slate-400 mb-2 font-medium">{d.roomType}</p>
      <div className="flex items-center gap-2 mb-1">
        <span className="w-2.5 h-2.5 rounded-full bg-[#6366F1] shrink-0" />
        <span className="text-slate-700 dark:text-slate-300">Bookings</span>
        <span className="ml-auto font-bold text-slate-900 dark:text-slate-100">{d.bookings}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-[#14B8A6] shrink-0" />
        <span className="text-slate-700 dark:text-slate-300">Revenue</span>
        <span className="ml-auto font-bold text-slate-900 dark:text-slate-100">{formatCurrency(d.revenue)}</span>
      </div>
    </div>
  );
}

export default function TopRoomTypesChart({ data, loading }: Props) {
  return (
    <ChartCard title="Top Room Types">
      {loading ? (
        <ChartSkeleton />
      ) : !data.length ? (
        <ChartEmpty />
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(220, data.length * 44)}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ left: 0, right: 16, top: 8, bottom: 8 }}
            barCategoryGap="30%"
          >
            <defs>
              <linearGradient id="roomBarGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#6366F1" />
                <stop offset="100%" stopColor="#8B5CF6" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" horizontal={false} />
            <XAxis
              type="number"
              tickFormatter={formatAxisTick}
              tick={{ fontSize: 11, fill: '#94A3B8' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="roomType"
              width={100}
              tick={{ fontSize: 11, fill: '#94A3B8', fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<TooltipContent />} cursor={{ fill: 'rgba(99,102,241,0.06)' }} />
            <Bar
              dataKey="revenue"
              fill="url(#roomBarGrad)"
              radius={[0, 6, 6, 0]}
              isAnimationActive
              animationDuration={800}
              maxBarSize={32}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}