"use client";

import { useState } from "react";
import { RoleGate } from "@/components/auth/RoleGate";

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

export default function AdminBookingsPage() {
  return (
    <RoleGate allow={["ADMIN"]} loginRoute="/auth/staff-signin">
      <AdminBookingsContent />
    </RoleGate>
  );
}

function AdminBookingsContent() {
  function getToken() {
    if (typeof window === "undefined") {
      return "";
    }
    return localStorage.getItem("hotel_saas_token") ?? "";
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
    roomId: "",
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

  async function refreshBookings() {
    const authHeader = requireAuthHeader();
    if (!authHeader) {
      return;
    }

    setLoading(true);
    setError("");

    const res = await fetch("/api/admin/bookings", {
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
      roomId: form.roomId,
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

    const res = await fetch("/api/admin/bookings", {
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
          : `/api/admin/bookings/${bookingId}/cancel`;

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
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="mb-3 text-3xl font-black text-slate-900">Booking Management</h1>
      <p className="mb-6 text-slate-600">Core booking engine UI for creating and managing reservations and lifecycle transitions.</p>

      {error ? <p className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {loading ? <p className="mb-4 text-sm text-slate-500">Loading...</p> : null}

      <div className="mb-6">
        <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white" onClick={refreshBookings}>
          Refresh Bookings
        </button>
      </div>

      <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-xl font-bold text-slate-900">Create Booking (PENDING + Room RESERVED)</h2>
        <form onSubmit={createBooking} className="grid gap-3 md:grid-cols-2">
          <input className="rounded-lg border border-slate-300 px-3 py-2" placeholder="Room ID" value={form.roomId} onChange={(e) => setForm((v) => ({ ...v, roomId: e.target.value }))} required />
          <input className="rounded-lg border border-slate-300 px-3 py-2" placeholder="Optional User ID" value={form.userId} onChange={(e) => setForm((v) => ({ ...v, userId: e.target.value }))} />
          <input className="rounded-lg border border-slate-300 px-3 py-2" type="date" value={form.arrivalDate} onChange={(e) => setForm((v) => ({ ...v, arrivalDate: e.target.value }))} required />
          <input className="rounded-lg border border-slate-300 px-3 py-2" type="number" min={1} value={form.nights} onChange={(e) => setForm((v) => ({ ...v, nights: Number(e.target.value) }))} required />
          <input className="rounded-lg border border-slate-300 px-3 py-2" type="number" min={1} value={form.adults} onChange={(e) => setForm((v) => ({ ...v, adults: Number(e.target.value) }))} required />
          <input className="rounded-lg border border-slate-300 px-3 py-2" type="number" min={0} value={form.children} onChange={(e) => setForm((v) => ({ ...v, children: Number(e.target.value) }))} required />
          <select className="rounded-lg border border-slate-300 px-3 py-2" value={form.pricingPlan} onChange={(e) => setForm((v) => ({ ...v, pricingPlan: e.target.value }))}>
            <option value="BED_ONLY">BED_ONLY</option>
            <option value="BED_BREAKFAST">BED_BREAKFAST</option>
          </select>
          <input className="rounded-lg border border-slate-300 px-3 py-2" placeholder="Guest full name" value={form.fullName} onChange={(e) => setForm((v) => ({ ...v, fullName: e.target.value }))} required />
          <input className="rounded-lg border border-slate-300 px-3 py-2" type="email" placeholder="Guest email" value={form.email} onChange={(e) => setForm((v) => ({ ...v, email: e.target.value }))} required />
          <input className="rounded-lg border border-slate-300 px-3 py-2" placeholder="Guest phone" value={form.phone} onChange={(e) => setForm((v) => ({ ...v, phone: e.target.value }))} required />
          <input className="rounded-lg border border-slate-300 px-3 py-2 md:col-span-2" placeholder="Guest ID/passport URL" value={form.identityDocumentUrl} onChange={(e) => setForm((v) => ({ ...v, identityDocumentUrl: e.target.value }))} required />
          <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white md:col-span-2" type="submit">
            Create Booking
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-xl font-bold text-slate-900">Bookings</h2>
        <div className="grid gap-3">
          {bookings.map((booking) => (
            <article key={booking._id} className="grid gap-2 rounded-xl border border-slate-200 p-4 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <p className="font-semibold text-slate-900">{booking.bookingRef} - {booking.status}</p>
                <p className="text-sm text-slate-600">Room: {booking.roomId} | {booking.pricingPlan} | Total: ${booking.totalPrice}</p>
                <p className="text-sm text-slate-600">Guest: {booking.guestSnapshot?.fullName} ({booking.guestSnapshot?.email})</p>
                <p className="text-sm text-slate-600">{new Date(booking.arrivalDate).toLocaleDateString()} to {new Date(booking.departureDate).toLocaleDateString()}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white" onClick={() => lifecycleAction(booking._id, "checkin")}>Check-In</button>
                <button className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white" onClick={() => lifecycleAction(booking._id, "checkout")}>Check-Out</button>
                <button className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white" onClick={() => lifecycleAction(booking._id, "cancel")}>Cancel</button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
