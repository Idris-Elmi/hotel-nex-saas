"use client";

import { useState, useEffect } from "react";
import { triggerAnalyticsRefresh } from "@/lib/analyticsRefresh";

function getAuthHeaders() {
  const token = sessionStorage.getItem("hotel_saas_token_staff")?.trim() ?? "";
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

export default function ManageBookingSection({ externalBookingId }: { externalBookingId?: string }) {
  const [bookingId, setBookingId] = useState("");

  useEffect(() => {
    if (externalBookingId) setBookingId(externalBookingId);
  }, [externalBookingId]);
  const [message, setMessage] = useState("");

  async function post(endpoint: string, body?: unknown) {
    setMessage("");
    const response = await fetch(endpoint, {
      method: "POST",
      headers: getAuthHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(payload.message ?? "Request failed");
      return;
    }
    setMessage("Action completed successfully.");
    triggerAnalyticsRefresh();
  }

  return (
    <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-6 shadow-sm transition-all duration-200 space-y-5">
      <h2 className="text-xl font-serif font-semibold text-slate-900 dark:text-slate-100">Manage Existing Booking</h2>

      {message ? <p className="rounded-xl bg-slate-100 dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-800 dark:text-slate-200">{message}</p> : null}

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Booking ID</span>
        <input
          className="w-full px-4 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-all duration-200"
          value={bookingId}
          onChange={(e) => setBookingId(e.target.value)}
          placeholder="Paste booking ID"
        />
      </label>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-slate-900 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-600 active:scale-[0.99] transition-all duration-200"
          onClick={() => post(`/api/reception/bookings/${bookingId}/check-in`)}
        >
          Check-In
        </button>
        <button
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 active:scale-[0.99] transition-all duration-200"
          onClick={() => post(`/api/reception/bookings/${bookingId}/check-out`, {})}
        >
          Check-Out
        </button>
        <button
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 active:scale-[0.99] transition-all duration-200"
          onClick={() => post(`/api/reception/bookings/${bookingId}/extend`, { extraNights: 1 })}
        >
          Extend 1 Night
        </button>
      </div>
    </section>
  );
}
