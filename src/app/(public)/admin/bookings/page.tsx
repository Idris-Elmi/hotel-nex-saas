"use client";

import { useState } from "react";
import { RoleGate } from "@/components/auth/RoleGate";
import { triggerAnalyticsRefresh } from "@/lib/analyticsRefresh";

type Booking = {
  _id: string;
  bookingRef: string;
  status: "PENDING" | "CONFIRMED" | "CHECKED_IN" | "CHECKED_OUT" | "CANCELLED";
  pricingPlan: "BED_ONLY" | "BED_BREAKFAST";
  arrivalDate: string;
  departureDate: string;
  totalPrice: number;
  roomId: string;
  guestSnapshot: {
    fullName: string;
    email: string;
    phone?: string;
  };
};

type DetailedBooking = Booking & {
  roomNumber?: string;
  paymentStatus?: string;
  guests?: { adults?: number; children?: number };
  adults?: number;
  children?: number;
};

export default function AdminBookingsPage({ apiBase }: { apiBase?: string } = {}) {
  return (
    <RoleGate allow={["OWNER", "ADMIN"]} loginRoute="/auth/staff-signin">
      <AdminBookingsContent apiBase={apiBase} />
    </RoleGate>
  );
}

function AdminBookingsContent({ apiBase = "/api/admin" }: { apiBase?: string }) {
  function getToken() {
    if (typeof window === "undefined") {
      return "";
    }
    return (sessionStorage.getItem("hotel_saas_token_staff") || "") ?? "";
  }

  function requireAuthHeader() {
    const token = getToken().trim();
    if (!token) {
      setError("Missing JWT token. Login as ADMIN or RECEPTIONIST first.");
      return null;
    }
    return { Authorization: `Bearer ${token}` };
  }

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    roomNumber: "",
    userId: "",
    arrivalDate: new Date().toISOString().slice(0, 10),
    nights: 2,
    adults: 2,
    children: 0,
    pricingPlan: "BED_ONLY",
    fullName: "",
    email: "",
    phone: "",
    identityDocumentUrl: "/uploads/ids/example.jpg",
  });

  const [lookupQuery, setLookupQuery] = useState("");
  const [lookupType, setLookupType] = useState<"bookingId" | "name" | "email" | "phone">("bookingId");
  const [lookupResult, setLookupResult] = useState<DetailedBooking | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  async function refreshBookings() {
    const authHeader = requireAuthHeader();
    if (!authHeader) {
      return;
    }

    setLoading(true);
    setError("");

    const res = await fetch(`${apiBase}/bookings`, {
      headers: authHeader,
      cache: "no-store",
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      if (res.status === 401) {
        setError("Your session expired. Please login again.");
        return;
      }
      setError(data.message ?? "Failed to load bookings");
      return;
    }

    setBookings(data.bookings ?? []);
  }

  async function createBooking(e: React.FormEvent) {
    e.preventDefault();
    const authHeader = requireAuthHeader();
    if (!authHeader) {
      return;
    }

    setError("");

    const payload = {
      userId: form.userId || undefined,
      roomNumber: form.roomNumber,
      arrivalDate: form.arrivalDate,
      nights: Number(form.nights),
      guests: {
        adults: Number(form.adults),
        children: Number(form.children),
      },
      pricingPlan: form.pricingPlan,
      guest: {
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        identityDocumentUrl: form.identityDocumentUrl,
        privacyAccepted: true,
      },
      idempotencyKey: crypto.randomUUID(),
    };

    const res = await fetch(`${apiBase}/bookings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeader,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      if (res.status === 401) {
        setError("Your session expired. Please login again.");
        return;
      }
      setError(data.message ?? "Failed to create booking");
      return;
    }

    await refreshBookings();
    triggerAnalyticsRefresh();
  }

  async function lifecycleAction(bookingId: string, action: "checkin" | "checkout" | "cancel") {
    const authHeader = requireAuthHeader();
    if (!authHeader) {
      return;
    }

    const endpoint =
      action === "checkin"
        ? `/api/bookings/${bookingId}/checkin`
        : action === "checkout"
          ? `/api/bookings/${bookingId}/checkout`
          : `${apiBase}/bookings/${bookingId}/cancel`;

    const res = await fetch(endpoint, {
      method: "POST",
      headers: authHeader,
    });

    const data = await res.json();
    if (!res.ok) {
      if (res.status === 401) {
        setError("Your session expired. Please login again.");
        return;
      }
      setError(data.message ?? `Failed to ${action} booking`);
      return;
    }

    await refreshBookings();
    triggerAnalyticsRefresh();
  }

  async function handleLookup() {
    if (!lookupQuery.trim()) return;
    setLookupLoading(true);
    setLookupError(null);
    setLookupResult(null);
    try {
      const param =
        lookupType === "bookingId" ? "bookingId"
        : lookupType === "name" ? "guestName"
        : lookupType === "email" ? "guestEmail"
        : "guestPhone";
      const res = await fetch(`${apiBase}/bookings/search?${param}=${encodeURIComponent(lookupQuery.trim())}`, {
        headers: requireAuthHeader() ?? {},
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Not found");
      setLookupResult(Array.isArray(data) ? data[0] : data);
    } catch (err: unknown) {
      setLookupError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLookupLoading(false);
    }
  }

  async function handleLookupStatusUpdate(bookingId: string, newStatus: string) {
    const authHeader = requireAuthHeader();
    if (!authHeader) return;
    try {
      if (newStatus === "CHECKED_IN") {
        await lifecycleAction(bookingId, "checkin");
      } else if (newStatus === "CHECKED_OUT") {
        await lifecycleAction(bookingId, "checkout");
      } else if (newStatus === "CANCELLED") {
        await lifecycleAction(bookingId, "cancel");
      } else {
        const res = await fetch(`${apiBase}/bookings/${bookingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...authHeader },
          body: JSON.stringify({ status: newStatus }),
        });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error || "Failed to update status");
        }
        triggerAnalyticsRefresh();
      }
      const param =
        lookupType === "bookingId" ? "bookingId"
        : lookupType === "name" ? "guestName"
        : lookupType === "email" ? "guestEmail"
        : "guestPhone";
      const res = await fetch(`${apiBase}/bookings/search?${param}=${encodeURIComponent(lookupQuery.trim())}`, {
        headers: requireAuthHeader() ?? {},
      });
      const data = await res.json();
      if (res.ok) setLookupResult(Array.isArray(data) ? data[0] : data);
    } catch (err: unknown) {
      setLookupError(err instanceof Error ? err.message : "Status update failed");
    }
  }

  return (
    <main className="p-6 lg:p-8 space-y-8 bg-[#F0F4FF] dark:bg-[#070B1A] min-h-screen max-w-7xl mx-auto">
      <h1 className="text-2xl font-serif font-bold text-slate-900 dark:text-slate-100 mb-6">Booking Management</h1>

      {error ? <p className="rounded-xl bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-red-700 dark:text-red-400">{error}</p> : null}
      {loading ? <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">Loading...</p> : null}

      <div className="mb-6 bg-white dark:bg-[#0F1629] border border-slate-200 dark:border-[#1E2D4A] rounded-2xl p-5 shadow-sm">
        <button className="rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 transition-all duration-200" onClick={refreshBookings}>
          Refresh Bookings
        </button>
      </div>

      <section className="mb-8 bg-white dark:bg-[#0F1629] border border-slate-200 dark:border-[#1E2D4A] rounded-2xl p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-[#8892B8] dark:text-[#4B5580] mb-4">Create Booking (PENDING + Room RESERVED)</h2>
        <form onSubmit={createBooking} className="grid gap-3 md:grid-cols-2">
          <input className="rounded-xl border border-[#E0E7FF] dark:border-[#1E2D4A] bg-[#F1F5FF] dark:bg-[#1A2540] px-3 py-2 text-sm text-[#0D1340] dark:text-[#EEF2FF]" placeholder="Room Number (e.g. 101)" value={form.roomNumber} onChange={(e) => setForm((v) => ({ ...v, roomNumber: e.target.value }))} required />
          <input className="rounded-xl border border-[#E0E7FF] dark:border-[#1E2D4A] bg-[#F1F5FF] dark:bg-[#1A2540] px-3 py-2 text-sm text-[#0D1340] dark:text-[#EEF2FF]" placeholder="Optional User ID" value={form.userId} onChange={(e) => setForm((v) => ({ ...v, userId: e.target.value }))} />
          <input className="rounded-xl border border-[#E0E7FF] dark:border-[#1E2D4A] bg-[#F1F5FF] dark:bg-[#1A2540] px-3 py-2 text-sm text-[#0D1340] dark:text-[#EEF2FF]" type="date" value={form.arrivalDate} onChange={(e) => setForm((v) => ({ ...v, arrivalDate: e.target.value }))} required />
          <input className="rounded-xl border border-[#E0E7FF] dark:border-[#1E2D4A] bg-[#F1F5FF] dark:bg-[#1A2540] px-3 py-2 text-sm text-[#0D1340] dark:text-[#EEF2FF]" type="number" min={1} value={form.nights} onChange={(e) => setForm((v) => ({ ...v, nights: Number(e.target.value) }))} required />
          <input className="rounded-xl border border-[#E0E7FF] dark:border-[#1E2D4A] bg-[#F1F5FF] dark:bg-[#1A2540] px-3 py-2 text-sm text-[#0D1340] dark:text-[#EEF2FF]" type="number" min={1} value={form.adults} onChange={(e) => setForm((v) => ({ ...v, adults: Number(e.target.value) }))} required />
          <input className="rounded-xl border border-[#E0E7FF] dark:border-[#1E2D4A] bg-[#F1F5FF] dark:bg-[#1A2540] px-3 py-2 text-sm text-[#0D1340] dark:text-[#EEF2FF]" type="number" min={0} value={form.children} onChange={(e) => setForm((v) => ({ ...v, children: Number(e.target.value) }))} required />
          <select className="rounded-xl border border-[#E0E7FF] dark:border-[#1E2D4A] bg-[#F1F5FF] dark:bg-[#1A2540] px-3 py-2 text-sm text-[#0D1340] dark:text-[#EEF2FF]" value={form.pricingPlan} onChange={(e) => setForm((v) => ({ ...v, pricingPlan: e.target.value }))}>
            <option value="BED_ONLY">BED_ONLY</option>
            <option value="BED_BREAKFAST">BED_BREAKFAST</option>
          </select>
          <input className="rounded-xl border border-[#E0E7FF] dark:border-[#1E2D4A] bg-[#F1F5FF] dark:bg-[#1A2540] px-3 py-2 text-sm text-[#0D1340] dark:text-[#EEF2FF]" placeholder="Guest full name" value={form.fullName} onChange={(e) => setForm((v) => ({ ...v, fullName: e.target.value }))} required />
          <input className="rounded-xl border border-[#E0E7FF] dark:border-[#1E2D4A] bg-[#F1F5FF] dark:bg-[#1A2540] px-3 py-2 text-sm text-[#0D1340] dark:text-[#EEF2FF]" type="email" placeholder="Guest email" value={form.email} onChange={(e) => setForm((v) => ({ ...v, email: e.target.value }))} required />
          <input className="rounded-xl border border-[#E0E7FF] dark:border-[#1E2D4A] bg-[#F1F5FF] dark:bg-[#1A2540] px-3 py-2 text-sm text-[#0D1340] dark:text-[#EEF2FF]" placeholder="Guest phone" value={form.phone} onChange={(e) => setForm((v) => ({ ...v, phone: e.target.value }))} required />
          <input className="rounded-xl border border-[#E0E7FF] dark:border-[#1E2D4A] bg-[#F1F5FF] dark:bg-[#1A2540] px-3 py-2 text-sm text-[#0D1340] dark:text-[#EEF2FF] md:col-span-2" placeholder="Guest ID/passport URL" value={form.identityDocumentUrl} onChange={(e) => setForm((v) => ({ ...v, identityDocumentUrl: e.target.value }))} required />
          <button className="rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 transition-all duration-200 md:col-span-2" type="submit">
            Create Booking
          </button>
        </form>
      </section>

      <section className="bg-white dark:bg-[#0F1629] border border-slate-200 dark:border-[#1E2D4A] rounded-2xl p-5 shadow-sm mb-6">
        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4">
          Lookup Booking
        </h2>
        <div className="flex gap-2 mb-4">
          {(["bookingId", "name", "email", "phone"] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setLookupType(t); setLookupQuery(""); setLookupResult(null); setLookupError(null); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                lookupType === t
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-100 dark:bg-[#1A2540] text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-[#252D47]"
              }`}
            >
              {t === "bookingId" ? "Booking ID" : t === "name" ? "Guest Name" : t === "email" ? "Email" : "Phone"}
            </button>
          ))}
        </div>
        <div className="flex gap-3 items-center">
          <input
            value={lookupQuery}
            onChange={(e) => setLookupQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLookup()}
            placeholder={lookupType === "bookingId" ? "e.g. BK-20240615-A3F2" : lookupType === "name" ? "e.g. John Smith" : lookupType === "email" ? "e.g. john@example.com" : "e.g. +1234567890"}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-[#1A2540] border border-slate-200 dark:border-[#252D47] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-all duration-200"
          />
          <button
            onClick={handleLookup}
            disabled={lookupLoading}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2"
          >
            {lookupLoading ? (
              <svg className="animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
            )}
            {lookupLoading ? "Searching..." : "Search"}
          </button>
          {(lookupResult || lookupError) && (
            <button
              onClick={() => { setLookupResult(null); setLookupError(null); setLookupQuery(""); }}
              className="px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#1A2540] transition-all duration-150"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
            </button>
          )}
        </div>

        {lookupError && (
          <div className="flex items-center gap-2 mt-3 text-sm text-rose-600 dark:text-rose-400">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            {lookupError}
          </div>
        )}

        {lookupResult && (
          <div className="bg-indigo-50/60 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-800 rounded-2xl p-5 mt-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-lg font-serif font-bold text-slate-900 dark:text-slate-100">{lookupResult.bookingRef}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">{lookupResult.guestSnapshot?.fullName}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  Room {(lookupResult as DetailedBooking).roomNumber || lookupResult.roomId} &middot; {new Date(lookupResult.arrivalDate).toLocaleDateString()} &rarr; {new Date(lookupResult.departureDate).toLocaleDateString()} &middot; {Math.ceil((new Date(lookupResult.departureDate).getTime() - new Date(lookupResult.arrivalDate).getTime()) / 86400000)} nights
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold inline-block w-fit ${
                lookupResult.status === "CONFIRMED" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" :
                lookupResult.status === "CHECKED_IN" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400" :
                lookupResult.status === "CHECKED_OUT" ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" :
                lookupResult.status === "CANCELLED" ? "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400" :
                "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
              }`}>{lookupResult.status}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              <div className="bg-white dark:bg-[#141829] rounded-xl p-3 border border-slate-200 dark:border-[#252D47]">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Total Price</p>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">ETB {lookupResult.totalPrice}</p>
              </div>
              <div className="bg-white dark:bg-[#141829] rounded-xl p-3 border border-slate-200 dark:border-[#252D47]">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Payment</p>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{(lookupResult as DetailedBooking).paymentStatus || "N/A"}</p>
              </div>
              <div className="bg-white dark:bg-[#141829] rounded-xl p-3 border border-slate-200 dark:border-[#252D47]">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Adults</p>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{(lookupResult as DetailedBooking).guests?.adults ?? (lookupResult as DetailedBooking).adults ?? "N/A"}</p>
              </div>
              <div className="bg-white dark:bg-[#141829] rounded-xl p-3 border border-slate-200 dark:border-[#252D47]">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Children</p>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{(lookupResult as DetailedBooking).guests?.children ?? (lookupResult as DetailedBooking).children ?? "N/A"}</p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-indigo-200 dark:border-indigo-800">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Update Booking Status</p>
              <div className="flex flex-wrap gap-2">
                {lookupResult.status === "PENDING" && (
                  <>
                    <button onClick={() => handleLookupStatusUpdate(lookupResult._id, "CONFIRMED")}
                      className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-all duration-200 active:scale-[0.99]">
                      Confirm Booking
                    </button>
                    <button onClick={() => handleLookupStatusUpdate(lookupResult._id, "CANCELLED")}
                      className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-rose-500 hover:bg-rose-600 transition-all duration-200 active:scale-[0.99]">
                      Cancel Booking
                    </button>
                  </>
                )}
                {lookupResult.status === "CONFIRMED" && (
                  <>
                    <button onClick={() => handleLookupStatusUpdate(lookupResult._id, "CHECKED_IN")}
                      className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 transition-all duration-200 active:scale-[0.99]">
                      Check In
                    </button>
                    <button onClick={() => handleLookupStatusUpdate(lookupResult._id, "CANCELLED")}
                      className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-rose-500 hover:bg-rose-600 transition-all duration-200 active:scale-[0.99]">
                      Cancel Booking
                    </button>
                  </>
                )}
                {lookupResult.status === "CHECKED_IN" && (
                  <button onClick={() => handleLookupStatusUpdate(lookupResult._id, "CHECKED_OUT")}
                    className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 transition-all duration-200 active:scale-[0.99]">
                    Check Out
                  </button>
                )}
                {(lookupResult.status === "CHECKED_OUT" || lookupResult.status === "CANCELLED") && (
                  <p className="text-xs text-slate-400 dark:text-slate-500">No further actions available.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="bg-white dark:bg-[#0F1629] border border-slate-200 dark:border-[#1E2D4A] rounded-2xl p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-[#8892B8] dark:text-[#4B5580] mb-4">Bookings</h2>
        <div className="grid gap-3">
          {bookings.map((booking) => (
            <article key={booking._id} className="grid gap-2 rounded-xl border border-slate-200 dark:border-[#1E2D4A] bg-white dark:bg-[#0F1629] p-4 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">{booking.bookingRef} - {booking.status}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Room: {booking.roomId} | {booking.pricingPlan} | Total: ETB {booking.totalPrice}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Guest: {booking.guestSnapshot?.fullName} ({booking.guestSnapshot?.email})</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">{new Date(booking.arrivalDate).toLocaleDateString()} to {new Date(booking.departureDate).toLocaleDateString()}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 transition-all duration-200" onClick={() => lifecycleAction(booking._id, "checkin")}>Check-In</button>
                <button className="rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 transition-all duration-200" onClick={() => lifecycleAction(booking._id, "checkout")}>Check-Out</button>
                <button className="rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 transition-all duration-200" onClick={() => lifecycleAction(booking._id, "cancel")}>Cancel</button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
