"use client";

import { useState, useEffect, useCallback } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { getToken } from "@/lib/utils/format";
import { onAnalyticsRefresh } from "@/lib/analyticsRefresh";
import ChartCard from "./ChartCard";
import ChartSkeleton from "./ChartSkeleton";
import ChartEmpty from "./ChartEmpty";

type OccupancyData = { label: string; occupancyRate: number };
type Period = "today" | "weekly" | "monthly" | "yearly";

const PERIODS: { key: Period; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
  { key: "yearly", label: "Yearly" },
];

function TooltipContent({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const val = payload[0].value;
  return (
    <div className="bg-white dark:bg-[#1A2540] border border-slate-200 dark:border-[#252D47] rounded-xl shadow-xl px-4 py-3 text-xs">
      <p className="text-slate-500 dark:text-slate-400 mb-1.5 font-medium">{label}</p>
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-[#6366F1] shrink-0" />
        <span className="text-slate-700 dark:text-slate-300">Occupancy</span>
        <span className="ml-auto font-bold text-slate-900 dark:text-slate-100">{val.toFixed(1)}%</span>
      </div>
    </div>
  );
}

function formatYTick(value: number) {
  return `${Math.round(value)}%`;
}

export default function OccupancyAreaChart({ apiBase = "/api/admin" }: { apiBase?: string } = {}) {
  const [period, setPeriod] = useState<Period>("monthly");
  const [data, setData] = useState<OccupancyData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async (p: Period) => {
    setLoading(true);
    try {
      const token = getToken().trim();
      if (!token) { setLoading(false); return; }
      const res = await fetch(`${apiBase}/analytics?chart=occupancyTrend&period=${p}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const json = await res.json();
      setData(json.data ?? []);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(period); }, [period, fetchData]);

  useEffect(() => {
    const unsub = onAnalyticsRefresh(() => fetchData(period));
    return unsub;
  }, [period, fetchData]);

  return (
    <ChartCard
      title="Occupancy Rate"
      action={
        <div className="flex gap-1 bg-slate-100 dark:bg-[#141E35] p-1 rounded-xl">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                p.key === period
                  ? "bg-white dark:bg-[#1A2540] text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      }
    >
      {loading ? (
        <ChartSkeleton />
      ) : !data.length ? (
        <ChartEmpty />
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data} margin={{ left: 0, right: 0, top: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#94A3B8', fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tickFormatter={formatYTick}
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: '#94A3B8' }}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip content={<TooltipContent />} />
            <Area
              type="monotone"
              dataKey="occupancyRate"
              stroke="#6366F1"
              strokeWidth={2.5}
              fill="rgba(99,102,241,0.15)"
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}