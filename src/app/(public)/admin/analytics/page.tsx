"use client";

import { useState, useEffect, useCallback } from "react";
import { RoleGate } from "@/components/auth/RoleGate";
import { BarChart2 } from "lucide-react";
import { getToken, formatCurrency } from "@/lib/utils/format";
import { onAnalyticsRefresh } from "@/lib/analyticsRefresh";
import KpiCard from "@/components/analytics/KpiCard";
import RevenueBarChart from "@/components/analytics/RevenueBarChart";
import BookingTrendsChart from "@/components/analytics/BookingTrendsChart";
import OccupancyAreaChart from "@/components/analytics/OccupancyAreaChart";
import BookingStatusDonut from "@/components/analytics/BookingStatusDonut";
import TopRoomTypesChart from "@/components/analytics/TopRoomTypesChart";

type MonthlyRevenuePoint = {
  month: string;
  year: number;
  revenue: number;
  bookings: number;
};

type BookingState = { _id: string; count: number };

type AnalyticsResponse = {
  filter: {
    preset: string;
    from: string;
    to: string;
    daysInRange: number;
  };
  metrics: {
    activeRooms: number;
    occupiedRoomNights: number;
    availableRoomNights: number;
    occupancyRate: number;
    revenuePerRoom: number;
    netRevenue: number;
  };
  bookingStates: BookingState[];
  monthlyRevenue: MonthlyRevenuePoint[];
  topRoomTypes: { roomType: string; bookings: number; revenue: number }[];
};

function AdminAnalyticsContent({ apiBase = "/api/admin" }: { apiBase?: string }) {
  const [preset, setPreset] = useState("30d");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);

  const fetchAnalytics = useCallback(async (p: string, f?: string, t?: string) => {
    const token = getToken().trim();
    if (!token) { setError("Missing JWT token. Login as ADMIN first."); return; }

    const params = new URLSearchParams({ preset: p });
    if (p === "custom" && f && t) {
      params.set("from", f);
      params.set("to", t);
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${apiBase}/analytics?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const payload = await res.json();
      if (!res.ok) {
        setError(payload.message ?? "Failed to load analytics");
        setAnalytics(null);
      } else {
        setAnalytics(payload);
      }
    } catch {
      setError("Network error loading analytics");
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics(preset, from, to);
  }, []);

  useEffect(() => {
    const unsub = onAnalyticsRefresh(() => fetchAnalytics(preset, from, to));
    return unsub;
  }, [preset, from, to, fetchAnalytics]);

  return (
    <main className="min-h-screen bg-[#F4F6FC] dark:bg-[#070B1A]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6 lg:space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">Analytics</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Overview of your hotel&apos;s performance</p>
          </div>
        </div>

        <div className="bg-white/70 dark:bg-[#0F1629]/70 backdrop-blur-md border border-slate-200/60 dark:border-[#1E2D4A]/50 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex flex-wrap items-end gap-3">
            <div className="grid gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <span>Period</span>
              <select
                className="rounded-xl border border-slate-200 dark:border-[#1E2D4A] bg-white dark:bg-[#1A2540] px-3 py-2 text-sm text-slate-800 dark:text-slate-200 min-w-[140px]"
                value={preset}
                onChange={(e) => { setPreset(e.target.value); fetchAnalytics(e.target.value, from, to); }}
              >
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
                <option value="ytd">Year to Date</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div className="grid gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <span>From</span>
              <input
                type="date"
                className="rounded-xl border border-slate-200 dark:border-[#1E2D4A] bg-white dark:bg-[#1A2540] px-3 py-2 text-sm text-slate-800 dark:text-slate-200 disabled:opacity-40"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                disabled={preset !== "custom"}
              />
            </div>
            <div className="grid gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <span>To</span>
              <input
                type="date"
                className="rounded-xl border border-slate-200 dark:border-[#1E2D4A] bg-white dark:bg-[#1A2540] px-3 py-2 text-sm text-slate-800 dark:text-slate-200 disabled:opacity-40"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                disabled={preset !== "custom"}
              />
            </div>
            <button
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50 transition-all duration-200 shadow-sm"
              onClick={() => fetchAnalytics(preset, from, to)}
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
          {error && (
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-900/20 px-3 py-2 text-xs text-red-600 dark:text-red-400">
              <BarChart2 size={14} />
              {error}
            </div>
          )}
        </div>

        {analytics && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Net Revenue"
              value={formatCurrency(analytics.metrics.netRevenue)}
              sublabel={`${analytics.filter.daysInRange} day range`}
              accent="bg-gradient-to-r from-indigo-500 to-purple-500"
            />
            <KpiCard
              label="Occupancy Rate"
              value={`${analytics.metrics.occupancyRate.toFixed(1)}%`}
              sublabel={`${analytics.metrics.occupiedRoomNights} room nights`}
              accent="bg-gradient-to-r from-teal-400 to-emerald-500"
            />
            <KpiCard
              label="Rev. per Room"
              value={formatCurrency(analytics.metrics.revenuePerRoom)}
              sublabel={`${analytics.metrics.activeRooms} active rooms`}
              accent="bg-gradient-to-r from-amber-400 to-orange-500"
            />
            <KpiCard
              label="Active Rooms"
              value={String(analytics.metrics.activeRooms)}
              sublabel={`${analytics.metrics.availableRoomNights} available nights`}
              accent="bg-gradient-to-r from-cyan-400 to-blue-500"
            />
          </div>
        )}

        {analytics && (
          <>
            <RevenueBarChart
              data={analytics.monthlyRevenue ?? []}
              loading={loading}
              error={error}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <BookingTrendsChart apiBase={apiBase} />
              <OccupancyAreaChart apiBase={apiBase} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <BookingStatusDonut
                data={Object.fromEntries((analytics.bookingStates ?? []).map((s: BookingState) => [s._id, s.count]))}
                loading={loading}
              />
              <TopRoomTypesChart
                data={analytics.topRoomTypes ?? []}
                loading={loading}
              />
            </div>
          </>
        )}

        {!analytics && !error && (
          <div className="space-y-6">
            <div className="h-[280px] rounded-2xl bg-white/50 dark:bg-[#0F1629]/50 border border-slate-200/50 dark:border-[#1E2D4A]/50 animate-pulse" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-[280px] rounded-2xl bg-white/50 dark:bg-[#0F1629]/50 border border-slate-200/50 dark:border-[#1E2D4A]/50 animate-pulse" />
              <div className="h-[280px] rounded-2xl bg-white/50 dark:bg-[#0F1629]/50 border border-slate-200/50 dark:border-[#1E2D4A]/50 animate-pulse" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="h-[260px] rounded-2xl bg-white/50 dark:bg-[#0F1629]/50 border border-slate-200/50 dark:border-[#1E2D4A]/50 animate-pulse" />
              <div className="h-[260px] rounded-2xl bg-white/50 dark:bg-[#0F1629]/50 border border-slate-200/50 dark:border-[#1E2D4A]/50 animate-pulse" />
              <div className="h-[260px] rounded-2xl bg-white/50 dark:bg-[#0F1629]/50 border border-slate-200/50 dark:border-[#1E2D4A]/50 animate-pulse" />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function AdminAnalyticsPage({ apiBase }: { apiBase?: string } = {}) {
  return (
    <RoleGate allow={["OWNER", "ADMIN"]} loginRoute="/auth/staff-signin">
      <AdminAnalyticsContent apiBase={apiBase} />
    </RoleGate>
  );
}
