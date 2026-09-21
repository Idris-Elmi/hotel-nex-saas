"use client";

import { useState, useEffect, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { getToken, formatCountAxisTick } from "@/lib/utils/format";
import { onAnalyticsRefresh } from "@/lib/analyticsRefresh";
import ChartCard from "./ChartCard";
import ChartSkeleton from "./ChartSkeleton";
import ChartEmpty from "./ChartEmpty";

type BookingData = { label: string; bookings: number };
type Period = "today" | "7d" | "30d" | "12m";

const PERIODS: { key: Period; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7 Days" },
  { key: "30d", label: "30 Days" },
  { key: "12m", label: "12 Months" },
];

function TooltipContent({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-[#1A2540] border border-slate-200 dark:border-[#252D47] rounded-xl shadow-xl px-4 py-3 text-xs">
      <p className="text-slate-500 dark:text-slate-400 mb-1.5 font-medium">{label}</p>
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-[#6366F1] shrink-0" />
        <span className="text-slate-700 dark:text-slate-300">Bookings</span>
        <span className="ml-auto font-bold text-slate-900 dark:text-slate-100">{payload[0].value}</span>
      </div>
    </div>
  );
}

export default function BookingTrendsChart({ apiBase = "/api/admin" }: { apiBase?: string } = {}) {
  const [period, setPeriod] = useState<Period>("30d");
  const [data, setData] = useState<BookingData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async (p: Period) => {
    setLoading(true);
    try {
      const token = getToken().trim();
      if (!token) { setLoading(false); return; }
      const res = await fetch(`${apiBase}/analytics?chart=bookingTrends&period=${p}`, {
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
      title="Booking Trends"
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
          <LineChart data={data} margin={{ left: 0, right: 0, top: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#94A3B8', fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tickFormatter={formatCountAxisTick}
              allowDecimals={false}
              tick={{ fontSize: 11, fill: '#94A3B8' }}
              axisLine={false}
              tickLine={false}
              width={36}
            />
            <Tooltip content={<TooltipContent />} />
            <Line
              type="monotone"
              dataKey="bookings"
              stroke="#6366F1"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 6, fill: "#6366F1", stroke: "#fff", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}