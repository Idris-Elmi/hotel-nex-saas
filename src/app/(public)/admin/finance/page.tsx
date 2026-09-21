"use client";

import { useState, useEffect, useCallback } from "react";
import { RoleGate } from "@/components/auth/RoleGate";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { getToken, formatCurrency, formatAxisTick } from "@/lib/utils/format";
import KpiCard from "@/components/analytics/KpiCard";
import ChartTooltip from "@/components/analytics/ChartTooltip";

type FinanceOverviewResponse = {
  success: boolean;
  period: string;
  labels: string[];
  datasets: { label: string; data: number[] }[];
  summary: {
    totalIncome: number;
    totalExpenses: number;
    netProfit: number;
    grossProfit: number;
    operatingProfit: number;
    totalTransactions: number;
  };
};

const PERIODS = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7 Days" },
  { key: "30d", label: "30 Days" },
  { key: "monthly", label: "Monthly" },
  { key: "quarterly", label: "Quarterly" },
  { key: "yearly", label: "Yearly" },
];

function AdminFinanceContent({ apiBase = "/api/admin" }: { apiBase?: string }) {
  const [period, setPeriod] = useState("monthly");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<FinanceOverviewResponse | null>(null);

  const fetchData = useCallback(async (p: string) => {
    const token = getToken().trim();
    if (!token) { setError("Missing JWT token. Login as OWNER first."); return; }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${apiBase}/analytics?chart=financeOverview&period=${p}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const payload = await res.json();
      if (!res.ok) {
        setError(payload.message ?? "Failed to load finance data");
        setData(null);
      } else {
        setData(payload);
      }
    } catch {
      setError("Network error loading finance data");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(period); }, []);

  const chartData = data ? data.labels.map((label, i) => ({
    label,
    Income: data.datasets[0]?.data[i] ?? 0,
    Expenses: data.datasets[1]?.data[i] ?? 0,
    Profit: data.datasets[2]?.data[i] ?? 0,
  })) : [];

  return (
    <main className="min-h-screen bg-[#F4F6FC] dark:bg-[#070B1A]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6 lg:space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">Financial Dashboard</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Revenue vs expenses overview</p>
          </div>
        </div>

        <div className="bg-white/70 dark:bg-[#0F1629]/70 backdrop-blur-md border border-slate-200/60 dark:border-[#1E2D4A]/50 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex flex-wrap items-end gap-3">
            <div className="grid gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <span>Period</span>
              <select
                className="rounded-xl border border-slate-200 dark:border-[#1E2D4A] bg-white dark:bg-[#1A2540] px-3 py-2 text-sm text-slate-800 dark:text-slate-200 min-w-[140px]"
                value={period}
                onChange={(e) => { setPeriod(e.target.value); fetchData(e.target.value); }}
              >
                {PERIODS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
              </select>
            </div>
            <button
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50 transition-all duration-200 shadow-sm"
              onClick={() => fetchData(period)}
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  Loading
                </span>
              ) : "Refresh"}
            </button>
          </div>
          {error && <div className="mt-3 rounded-xl bg-red-50 dark:bg-red-900/20 px-3 py-2 text-xs text-red-600 dark:text-red-400">{error}</div>}
        </div>

        {data ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard label="Total Income" value={formatCurrency(data.summary.totalIncome)} sublabel={`${PERIODS.find(p => p.key === data.period)?.label ?? data.period} period`} accent="bg-gradient-to-r from-indigo-500 to-purple-500" />
              <KpiCard label="Total Expenses" value={formatCurrency(data.summary.totalExpenses)} accent="bg-gradient-to-r from-amber-400 to-orange-500" />
              <KpiCard label="Net Profit" value={formatCurrency(data.summary.netProfit)} sublabel={data.summary.netProfit >= 0 ? "Profitable" : "Loss"} accent="bg-gradient-to-r from-teal-400 to-emerald-500" />
              <KpiCard label="Transactions" value={String(data.summary.totalTransactions)} accent="bg-gradient-to-r from-cyan-400 to-blue-500" />
            </div>

            <div className="bg-white/70 dark:bg-[#0F1629]/70 backdrop-blur-md border border-slate-200/60 dark:border-[#1E2D4A]/50 rounded-2xl p-5 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4">Income vs Expenses ({data.period})</h3>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={chartData} margin={{ left: 0, right: 0, top: 8, bottom: 8 }}>
                  <defs>
                    <linearGradient id="finIncGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0D9488" />
                      <stop offset="100%" stopColor="#14B8A6" />
                    </linearGradient>
                    <linearGradient id="finExpGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F43F5E" />
                      <stop offset="100%" stopColor="#E11D48" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: '#94A3B8', fontWeight: 500 }}
                    tickLine={false}
                    axisLine={{ stroke: 'rgba(148,163,184,0.15)', strokeWidth: 1 }}
                    interval={0}
                    height={40}
                  />
                  <YAxis
                    tickFormatter={formatAxisTick}
                    tick={{ fontSize: 11, fill: '#94A3B8' }}
                    axisLine={false}
                    tickLine={false}
                    width={50}
                  />
                  <RechartsTooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(99,102,241,0.06)' }} />
                  <Bar dataKey="Income" fill="url(#finIncGrad)" radius={[4, 4, 0, 0]} maxBarSize={32} isAnimationActive animationDuration={800} />
                  <Bar dataKey="Expenses" fill="url(#finExpGrad)" radius={[4, 4, 0, 0]} maxBarSize={32} isAnimationActive animationDuration={800} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <KpiCard label="Gross Profit" value={formatCurrency(data.summary.grossProfit)} accent="bg-gradient-to-r from-indigo-500 to-purple-500" />
              <KpiCard label="Operating Profit" value={formatCurrency(data.summary.operatingProfit)} accent="bg-gradient-to-r from-teal-400 to-emerald-500" />
              <KpiCard label="Net Profit" value={formatCurrency(data.summary.netProfit)} accent="bg-gradient-to-r from-amber-400 to-orange-500" />
            </div>
          </>
        ) : !error ? (
          <div className="space-y-6">
            <div className="grid grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => <div key={i} className="h-[100px] rounded-2xl bg-white/50 dark:bg-[#0F1629]/50 border border-slate-200/50 dark:border-[#1E2D4A]/50 animate-pulse" />)}
            </div>
            <div className="h-[320px] rounded-2xl bg-white/50 dark:bg-[#0F1629]/50 border border-slate-200/50 dark:border-[#1E2D4A]/50 animate-pulse" />
          </div>
        ) : null}
      </div>
    </main>
  );
}

export default function AdminFinancePage({ apiBase }: { apiBase?: string } = {}) {
  return (
    <RoleGate allow={["OWNER"]} loginRoute="/auth/staff-signin">
      <AdminFinanceContent apiBase={apiBase} />
    </RoleGate>
  );
}
