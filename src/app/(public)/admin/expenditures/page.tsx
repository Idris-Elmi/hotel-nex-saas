"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { RoleGate } from "@/components/auth/RoleGate";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip } from "recharts";
import { getToken, formatCurrency, formatAxisTick, formatDate } from "@/lib/utils/format";
import KpiCard from "@/components/analytics/KpiCard";
import ChartTooltip from "@/components/analytics/ChartTooltip";

type ExpenditureAnalyticsResponse = {
  success: boolean;
  period: string;
  labels: string[];
  datasets: { label: string; data: number[] }[];
  summary: {
    totalExpenditure: number;
    totalTransactions: number;
    averageExpense: number;
    categoryBreakdown: { name: string; value: number }[];
  };
};

type ExpenditureRecord = {
  _id: string;
  title: string;
  category: string;
  amount: number;
  description?: string;
  date: string;
  paymentMethod: string;
};

type ExpenseFormState = {
  title: string;
  amount: string;
  description: string;
  date: string;
  paymentMethod: string;
  notes: string;
};

const categories = [
  "Maintenance", "Staff Salary", "Electricity", "Water", "Internet",
  "Food Supply", "Laundry", "Cleaning", "Tax", "Marketing",
  "Furniture", "Transportation", "Other",
];

const paymentMethods = [
  { value: "cash", label: "Cash" }, { value: "bank", label: "Bank" },
  { value: "transfer", label: "Transfer" }, { value: "mobile_money", label: "Mobile Money" },
  { value: "card", label: "Card" }, { value: "cheque", label: "Cheque" },
  { value: "other", label: "Other" },
];

const PIE_COLORS = [
  "#6366F1", "#14B8A6", "#F59E0B", "#F43F5E", "#8B5CF6", "#94A3B8",
  "#3B82F6", "#10B981", "#EC4899", "#A855F7", "#06B6D4", "#84CC16", "#F97316",
];

const EXPENDITURE_PERIODS = [
  { key: "daily", label: "Daily" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
  { key: "yearly", label: "Yearly" },
];

function AdminExpendituresContent({ apiBase = "/api/admin" }: { apiBase?: string }) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [analyticsPeriod, setAnalyticsPeriod] = useState("monthly");
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<ExpenditureAnalyticsResponse | null>(null);
  const [analyticsError, setAnalyticsError] = useState("");

  const [preset, setPreset] = useState("30d");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [records, setRecords] = useState<ExpenditureRecord[]>([]);
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ title: string; amount: string }>({ title: "", amount: "" });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [forms, setForms] = useState<Record<string, ExpenseFormState>>(() =>
    Object.fromEntries(categories.map((cat) => [cat, { title: "", amount: "", description: "", date: today, paymentMethod: "cash", notes: "" }]))
  );

  const fetchAnalytics = useCallback(async (p: string) => {
    const token = getToken().trim();
    if (!token) { setAnalyticsError("Missing JWT token."); return; }
    setAnalyticsLoading(true);
    setAnalyticsError("");
    try {
      const res = await fetch(`${apiBase}/analytics?chart=expenditureAnalytics&period=${p}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const payload = await res.json();
      if (!res.ok) { setAnalyticsError(payload.message ?? "Failed"); setAnalyticsData(null); }
      else { setAnalyticsData(payload); }
    } catch { setAnalyticsError("Network error"); setAnalyticsData(null); }
    finally { setAnalyticsLoading(false); }
  }, []);

  const fetchRecords = useCallback(async (p: string, f?: string, t?: string) => {
    const token = getToken().trim();
    if (!token) { setError("Missing JWT token."); return; }
    const params = new URLSearchParams({ preset: p });
    if (p === "custom" && f && t) { params.set("from", f); params.set("to", t); }
    setLoading(true); setError("");
    try {
      const res = await fetch(`${apiBase}/finance/expenditures?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
      });
      const payload = await res.json();
      if (!res.ok) { setError(payload.message ?? "Failed"); setRecords([]); }
      else { setRecords(payload.expenditures ?? []); }
    } catch { setError("Network error"); setRecords([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchAnalytics(analyticsPeriod);
    fetchRecords(preset, from, to);
  }, []);

  const chartData = analyticsData ? analyticsData.labels.map((label, i) => ({
    label,
    amount: analyticsData.datasets[0]?.data[i] ?? 0,
    transactions: analyticsData.datasets[1]?.data[i] ?? 0,
  })) : [];

  function toggleCategory(cat: string) { setOpenCategories((p) => ({ ...p, [cat]: !p[cat] })); }
  function updateForm(cat: string, patch: Partial<ExpenseFormState>) { setForms((p) => ({ ...p, [cat]: { ...p[cat], ...patch } })); }
  function startEdit(r: ExpenditureRecord) { setEditingId(r._id); setEditValues({ title: r.title, amount: String(r.amount) }); }
  function cancelEdit() { setEditingId(null); setEditValues({ title: "", amount: "" }); }

  async function saveEdit(record: ExpenditureRecord) {
    const token = getToken().trim(); if (!token) return;
    const amt = Number(editValues.amount);
    if (!editValues.title.trim()) { setError("Title required."); return; }
    if (!Number.isFinite(amt) || amt <= 0) { setError("Invalid amount."); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(`${apiBase}/finance/expenditures/${record._id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: editValues.title.trim(), amount: amt }),
      });
      const p = await res.json().catch(() => ({}));
      if (!res.ok) { setError(p.message ?? "Failed"); return; }
      setEditingId(null); setEditValues({ title: "", amount: "" });
      await fetchRecords(preset, from, to);
      await fetchAnalytics(analyticsPeriod);
    } catch (err) { setError(err instanceof Error ? err.message : "Network error"); }
    finally { setLoading(false); }
  }

  async function deleteExpenditure(id: string) {
    const token = getToken().trim(); if (!token) return;
    setLoading(true); setError("");
    try {
      const res = await fetch(`${apiBase}/finance/expenditures/${id}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { const p = await res.json().catch(() => ({})); setError(p.message ?? "Failed"); return; }
      setDeleteConfirm(null);
      await fetchRecords(preset, from, to);
      await fetchAnalytics(analyticsPeriod);
    } catch (err) { setError(err instanceof Error ? err.message : "Network error"); }
    finally { setLoading(false); }
  }

  async function submitExpense(category: string) {
    const token = getToken().trim(); if (!token) return;
    const form = forms[category];
    const amt = Number(form.amount);
    if (!form.title.trim() || !form.date) { setError("Title and date required."); return; }
    if (!Number.isFinite(amt) || amt <= 0) { setError("Invalid amount."); return; }
    const desc = [form.description.trim(), form.notes.trim() ? `Notes: ${form.notes.trim()}` : ""].filter(Boolean).join(" | ");
    setLoading(true); setError("");
    try {
      const res = await fetch(`${apiBase}/finance/expenditures`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: form.title.trim(), category, amount: amt, description: desc, date: form.date, paymentMethod: form.paymentMethod }),
      });
      const p = await res.json().catch(() => ({}));
      if (!res.ok) { setError(p.message ?? "Failed"); return; }
      updateForm(category, { title: "", amount: "", description: "", date: today, paymentMethod: form.paymentMethod, notes: "" });
      await fetchRecords(preset, from, to);
      await fetchAnalytics(analyticsPeriod);
    } catch (err) { setError(err instanceof Error ? err.message : "Network error"); }
    finally { setLoading(false); }
  }

  const groupedRecords = useMemo(() => {
    const groups = new Map<string, ExpenditureRecord[]>();
    for (const r of records) { const b = groups.get(r.category) ?? []; b.push(r); groups.set(r.category, b); }
    return groups;
  }, [records]);

  return (
    <main className="min-h-screen bg-[#F4F6FC] dark:bg-[#070B1A]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6 lg:space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">Expenditure Management</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Track and manage all expenses</p>
          </div>
        </div>

        <div className="bg-white/70 dark:bg-[#0F1629]/70 backdrop-blur-md border border-slate-200/60 dark:border-[#1E2D4A]/50 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex flex-wrap items-end gap-3 mb-4">
            <div className="grid gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <span>Chart Period</span>
              <select
                className="rounded-xl border border-slate-200 dark:border-[#1E2D4A] bg-white dark:bg-[#1A2540] px-3 py-2 text-sm text-slate-800 dark:text-slate-200 min-w-[120px]"
                value={analyticsPeriod}
                onChange={(e) => { setAnalyticsPeriod(e.target.value); fetchAnalytics(e.target.value); }}
              >
                {EXPENDITURE_PERIODS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
              </select>
            </div>
            <button
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50 transition-all duration-200 shadow-sm"
              onClick={() => fetchAnalytics(analyticsPeriod)}
              disabled={analyticsLoading}
            >
              {analyticsLoading ? "Loading..." : "Refresh"}
            </button>
          </div>
          {analyticsError && <div className="mb-4 rounded-xl bg-red-50 dark:bg-red-900/20 px-3 py-2 text-xs text-red-600 dark:text-red-400">{analyticsError}</div>}

          {analyticsData ? (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <KpiCard label="Total Expenditure" value={formatCurrency(analyticsData.summary.totalExpenditure)} accent="bg-gradient-to-r from-rose-500 to-pink-500" />
                <KpiCard label="Transactions" value={String(analyticsData.summary.totalTransactions)} accent="bg-gradient-to-r from-indigo-500 to-purple-500" />
                <KpiCard label="Average Expense" value={formatCurrency(analyticsData.summary.averageExpense)} accent="bg-gradient-to-r from-amber-400 to-orange-500" />
                <KpiCard label="Categories" value={String(analyticsData.summary.categoryBreakdown.length)} accent="bg-gradient-to-r from-cyan-400 to-blue-500" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white/70 dark:bg-[#0F1629]/70 backdrop-blur-md border border-slate-200/60 dark:border-[#1E2D4A]/50 rounded-2xl p-5 shadow-sm">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4">Expenditure Trend ({analyticsData.period})</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData} margin={{ left: 0, right: 0, top: 8, bottom: 8 }}>
                      <defs>
                        <linearGradient id="expAnalyticsGrad" x1="0" y1="0" x2="0" y2="1">
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
                      <RechartsTooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(225,29,72,0.06)' }} />
                      <Bar dataKey="amount" name="Expenditure" fill="url(#expAnalyticsGrad)" radius={[6, 6, 0, 0]} maxBarSize={40} isAnimationActive animationDuration={800} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white/70 dark:bg-[#0F1629]/70 backdrop-blur-md border border-slate-200/60 dark:border-[#1E2D4A]/50 rounded-2xl p-5 shadow-sm">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4">Expenditure by Category</h3>
                  {analyticsData.summary.categoryBreakdown.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={analyticsData.summary.categoryBreakdown}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius="50%"
                          outerRadius="72%"
                          paddingAngle={3}
                          isAnimationActive
                          animationDuration={800}
                        >
                          {analyticsData.summary.categoryBreakdown.map((_, idx) => (
                            <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} stroke="rgba(0,0,0,0.05)" strokeWidth={1} />
                          ))}
                        </Pie>
                        <RechartsTooltip content={<ChartTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-sm text-slate-400 dark:text-slate-600">No category data.</div>
                  )}
                </div>
              </div>
            </>
          ) : !analyticsError ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-[300px] rounded-2xl bg-white/50 dark:bg-[#0F1629]/50 border border-slate-200/50 dark:border-[#1E2D4A]/50 animate-pulse" />
              <div className="h-[300px] rounded-2xl bg-white/50 dark:bg-[#0F1629]/50 border border-slate-200/50 dark:border-[#1E2D4A]/50 animate-pulse" />
            </div>
          ) : null}
        </div>

        <div className="bg-white/70 dark:bg-[#0F1629]/70 backdrop-blur-md border border-slate-200/60 dark:border-[#1E2D4A]/50 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex flex-wrap items-end gap-3">
            <div className="grid gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <span>Date Range</span>
              <select className="rounded-xl border border-slate-200 dark:border-[#1E2D4A] bg-white dark:bg-[#1A2540] px-3 py-2 text-sm text-slate-800 dark:text-slate-200 min-w-[140px]" value={preset} onChange={(e) => { setPreset(e.target.value); fetchRecords(e.target.value, from, to); }}>
                <option value="7d">Last 7 Days</option><option value="30d">Last 30 Days</option><option value="90d">Last 90 Days</option><option value="ytd">Year to Date</option><option value="custom">Custom</option>
              </select>
            </div>
            <div className="grid gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <span>From</span>
              <input type="date" className="rounded-xl border border-slate-200 dark:border-[#1E2D4A] bg-white dark:bg-[#1A2540] px-3 py-2 text-sm text-slate-800 dark:text-slate-200 disabled:opacity-40" value={from} onChange={(e) => setFrom(e.target.value)} disabled={preset !== "custom"} />
            </div>
            <div className="grid gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <span>To</span>
              <input type="date" className="rounded-xl border border-slate-200 dark:border-[#1E2D4A] bg-white dark:bg-[#1A2540] px-3 py-2 text-sm text-slate-800 dark:text-slate-200 disabled:opacity-40" value={to} onChange={(e) => setTo(e.target.value)} disabled={preset !== "custom"} />
            </div>
            <button className="rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50 transition-all duration-200 shadow-sm" onClick={() => fetchRecords(preset, from, to)} disabled={loading}>{loading ? "Loading..." : "Load Records"}</button>
          </div>
          {error && <div className="mt-3 rounded-xl bg-red-50 dark:bg-red-900/20 px-3 py-2 text-xs text-red-600 dark:text-red-400">{error}</div>}
        </div>

        <div className="space-y-4">
          {categories.map((category) => {
            const isOpen = openCategories[category];
            const catRecords = groupedRecords.get(category) ?? [];
            const form = forms[category];
            return (
              <article key={category} className="bg-white/70 dark:bg-[#0F1629]/70 backdrop-blur-md border border-slate-200/60 dark:border-[#1E2D4A]/50 rounded-2xl shadow-sm overflow-hidden">
                <button type="button" onClick={() => toggleCategory(category)} className="flex w-full items-center justify-between px-5 py-4 text-left">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{category}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{catRecords.length} expenses</p>
                  </div>
                  <span className={`text-lg text-slate-500 dark:text-slate-400 transition ${isOpen ? "rotate-180" : ""}`}>⌄</span>
                </button>
                <div className={`overflow-hidden border-t border-slate-200/60 dark:border-[#1E2D4A]/50 transition-all duration-300 ${isOpen ? "max-h-fit opacity-100" : "max-h-0 opacity-0"}`}>
                  <div className="grid gap-4 px-5 py-4 lg:grid-cols-[1.2fr_1fr]">
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Existing Expenses</h3>
                      {catRecords.length === 0 ? <p className="text-sm text-slate-500 dark:text-slate-400">No expenses recorded.</p> : (
                        <div className="grid gap-2">
                          {catRecords.map((record) => (
                            <div key={record._id} className="rounded-lg border border-slate-200 dark:border-[#1E2D4A] bg-slate-50/70 dark:bg-[#1A2540]/70 px-3 py-2">
                              {editingId === record._id ? (
                                <div className="space-y-2">
                                  <input className="w-full rounded-lg border border-slate-300 dark:border-[#252D47] px-2 py-1.5 text-sm bg-white dark:bg-[#1A2540] text-slate-900 dark:text-slate-100" value={editValues.title} onChange={(e) => setEditValues((v) => ({ ...v, title: e.target.value }))} placeholder="Title" />
                                  <input className="w-full rounded-lg border border-slate-300 dark:border-[#252D47] px-2 py-1.5 text-sm bg-white dark:bg-[#1A2540] text-slate-900 dark:text-slate-100" type="number" min={0} step="0.01" value={editValues.amount} onChange={(e) => setEditValues((v) => ({ ...v, amount: e.target.value }))} placeholder="Amount" />
                                  <div className="flex gap-2">
                                    <button type="button" onClick={() => saveEdit(record)} disabled={loading} className="rounded-lg bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60 transition-all">Save</button>
                                    <button type="button" onClick={cancelEdit} className="rounded-lg border border-slate-300 dark:border-[#252D47] px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1A2540] transition-all">Cancel</button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">{record.title}</span>
                                    <span className="text-rose-600 dark:text-rose-400 font-semibold">{formatCurrency(record.amount)}</span>
                                  </div>
                                  <div className="mt-1 flex items-center justify-between">
                                    <span className="text-xs text-slate-500 dark:text-slate-400">{formatDate(record.date)} · {record.paymentMethod}</span>
                                    <div className="flex gap-2">
                                      <button type="button" onClick={() => startEdit(record)} className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">Edit</button>
                                      <button type="button" onClick={() => setDeleteConfirm(record._id)} className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline">Delete</button>
                                    </div>
                                  </div>
                                  {record.description ? <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{record.description}</p> : null}
                                  {deleteConfirm === record._id && (
                                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-[#1E2D4A]">
                                      <p className="text-xs text-rose-700 dark:text-rose-400 mb-2">Delete <strong>{record.title}</strong> permanently?</p>
                                      <div className="flex gap-2">
                                        <button type="button" onClick={() => deleteExpenditure(record._id)} disabled={loading} className="rounded-lg bg-rose-600 hover:bg-rose-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60 transition-all">{loading ? "Deleting..." : "Delete"}</button>
                                        <button type="button" onClick={() => setDeleteConfirm(null)} className="rounded-lg border border-slate-300 dark:border-[#252D47] px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1A2540] transition-all">Cancel</button>
                                      </div>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Add New Expense</h3>
                      <div className="grid gap-3">
                        <label className="grid gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400">Title
                          <input className="rounded-xl border border-slate-200 dark:border-[#1E2D4A] bg-white dark:bg-[#1A2540] px-3 py-2 text-sm text-slate-800 dark:text-slate-200" value={form.title} onChange={(e) => updateForm(category, { title: e.target.value })} placeholder="e.g. HVAC repair" />
                        </label>
                        <label className="grid gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400">Amount
                          <input className="rounded-xl border border-slate-200 dark:border-[#1E2D4A] bg-white dark:bg-[#1A2540] px-3 py-2 text-sm text-slate-800 dark:text-slate-200" type="number" min={0} step="0.01" value={form.amount} onChange={(e) => updateForm(category, { amount: e.target.value })} placeholder="250.00" />
                        </label>
                        <label className="grid gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400">Description
                          <textarea className="min-h-20 rounded-xl border border-slate-200 dark:border-[#1E2D4A] bg-white dark:bg-[#1A2540] px-3 py-2 text-sm text-slate-800 dark:text-slate-200" value={form.description} onChange={(e) => updateForm(category, { description: e.target.value })} placeholder="Short description" />
                        </label>
                        <label className="grid gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400">Date
                          <input className="rounded-xl border border-slate-200 dark:border-[#1E2D4A] bg-white dark:bg-[#1A2540] px-3 py-2 text-sm text-slate-800 dark:text-slate-200" type="date" value={form.date} onChange={(e) => updateForm(category, { date: e.target.value })} />
                        </label>
                        <label className="grid gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400">Method
                          <select className="rounded-xl border border-slate-200 dark:border-[#1E2D4A] bg-white dark:bg-[#1A2540] px-3 py-2 text-sm text-slate-800 dark:text-slate-200" value={form.paymentMethod} onChange={(e) => updateForm(category, { paymentMethod: e.target.value })}>
                            {paymentMethods.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                          </select>
                        </label>
                        <label className="grid gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400">Notes
                          <textarea className="min-h-16 rounded-xl border border-slate-200 dark:border-[#1E2D4A] bg-white dark:bg-[#1A2540] px-3 py-2 text-sm text-slate-800 dark:text-slate-200" value={form.notes} onChange={(e) => updateForm(category, { notes: e.target.value })} placeholder="Additional notes" />
                        </label>
                        <button type="button" onClick={() => submitExpense(category)} className="rounded-xl bg-rose-500 hover:bg-rose-600 active:bg-rose-700 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 shadow-sm disabled:opacity-50" disabled={loading}>Add Expense</button>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}

export default function AdminExpendituresPage({ apiBase }: { apiBase?: string } = {}) {
  return (
    <RoleGate allow={["OWNER"]} loginRoute="/auth/staff-signin">
      <AdminExpendituresContent apiBase={apiBase} />
    </RoleGate>
  );
}
