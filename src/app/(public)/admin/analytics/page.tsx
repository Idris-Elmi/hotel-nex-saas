"use client";

import { useState } from "react";
import { RoleGate } from "@/components/auth/RoleGate";

type RevenuePoint = {
  period: string;
  revenue: number;
};

type AnalyticsResponse = {
  filter: {
    preset: string;
    from: string;
    to: string;
    daysInRange: number;
  };
  revenue: {
    daily: RevenuePoint[];
    weekly: RevenuePoint[];
    monthly: RevenuePoint[];
    yearly: RevenuePoint[];
    totalRevenue: number;
  };
  metrics: {
    activeRooms: number;
    occupiedRoomNights: number;
    availableRoomNights: number;
    occupancyRate: number;
    revenuePerRoom: number;
    netRevenue: number;
  };
  bookingStates: Array<{ _id: string; count: number }>;
};

type AvailabilityRoom = {
  id: string;
  roomNumber: string;
  capacity: number;
  type?: {
    name?: string;
    code?: string;
  } | null;
  pricing?: {
    BED_ONLY?: {
      perNight?: number;
      addons?: number;
      subtotal?: number;
      taxes?: number;
      total?: number;
      currency?: string;
    };
    BED_BREAKFAST?: {
      perNight?: number;
      addons?: number;
      subtotal?: number;
      taxes?: number;
      total?: number;
      currency?: string;
    };
  };
};

type DetailedBooking = {
  _id: string;
  bookingRef: string;
  status: string;
  paymentStatus?: string;
  pricingPlan: string;
  guests?: {
    adults?: number;
    children?: number;
  };
  arrivalDate: string;
  departureDate: string;
  nights?: number;
  totalPrice: number;
  amountPaid?: number;
  pricing?: {
    perNight?: number;
    addons?: number;
    subtotal?: number;
    taxes?: number;
    total?: number;
    currency?: string;
  };
  roomId: string;
  room: {
    id: string;
    roomNumber: string;
    status?: string;
  } | null;
  customer: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    role?: string;
    identityType?: string;
    passportDocumentUrl?: string;
    provider?: string;
  } | null;
  guestSnapshot?: {
    fullName?: string;
    email?: string;
    phone?: string;
    identityDocumentUrl?: string;
  };
  createdAt?: string;
  checkInAt?: string;
  checkOutAt?: string;
  cancelledAt?: string;
  metadata?: Record<string, unknown>;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function RevenueTable({ title, rows }: { title: string; rows: RevenuePoint[] }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-3 text-lg font-bold text-slate-900">{title}</h3>
      <div className="grid gap-2">
        {rows.length === 0 ? <p className="text-sm text-slate-500">No data in selected period.</p> : null}
        {rows.slice(-12).map((row) => (
          <div key={row.period} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-lg bg-slate-50 px-3 py-2">
            <span className="text-sm text-slate-700">{row.period}</span>
            <span className="text-sm font-semibold text-slate-900">{formatCurrency(row.revenue)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function AdminAnalyticsPage() {
  return (
    <RoleGate allow={["ADMIN"]} loginRoute="/auth/staff-signin">
      <AdminAnalyticsContent />
    </RoleGate>
  );
}

function AdminAnalyticsContent() {
  function getToken() {
    if (typeof window === "undefined") {
      return "";
    }
    return localStorage.getItem("hotel_saas_token") ?? "";
  }

  function requireAuthHeader() {
    const token = getToken().trim();
    if (!token) {
      setError("Missing JWT token. Login as ADMIN first.");
      return null;
    }
    return { Authorization: `Bearer ${token}` };
  }

  const [preset, setPreset] = useState("30d");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [availabilityDate, setAvailabilityDate] = useState(new Date().toISOString().slice(0, 10));
  const [availabilityNights, setAvailabilityNights] = useState(2);
  const [availabilityGuests, setAvailabilityGuests] = useState(2);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");
  const [availabilityRooms, setAvailabilityRooms] = useState<AvailabilityRoom[]>([]);
  const [selectedAvailabilityRoomId, setSelectedAvailabilityRoomId] = useState("");
  const [availabilityDetailExpanded, setAvailabilityDetailExpanded] = useState(false);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingsError, setBookingsError] = useState("");
  const [detailedBookings, setDetailedBookings] = useState<DetailedBooking[]>([]);
  const [selectedBookingId, setSelectedBookingId] = useState("");
  const [bookingActionLoading, setBookingActionLoading] = useState(false);
  const [detailedBookingsExpanded, setDetailedBookingsExpanded] = useState(true);

  async function loadAnalytics() {
    const authHeader = requireAuthHeader();
    if (!authHeader) {
      return;
    }

    const params = new URLSearchParams({ preset });
    if (preset === "custom") {
      if (!from || !to) {
        setError("For custom range, set both from and to dates.");
        return;
      }
      params.set("from", from);
      params.set("to", to);
    }

    setLoading(true);
    setError("");

    const response = await fetch(`/api/admin/analytics?${params.toString()}`, {
      headers: authHeader,
      cache: "no-store",
    });

    const payload = await response.json();
    setLoading(false);

    if (!response.ok) {
      if (response.status === 401) {
        setError("Your admin session expired. Please login again.");
        return;
      }
      setError(payload.message ?? "Failed to load analytics");
      return;
    }

    setAnalytics(payload);
  }

  async function loadAvailabilityPreview() {
    const authHeader = requireAuthHeader();
    if (!authHeader) {
      return;
    }

    setAvailabilityLoading(true);
    setAvailabilityError("");

    const params = new URLSearchParams({
      arrivalDate: availabilityDate,
      nights: String(availabilityNights),
      guests: String(availabilityGuests),
    });

    const response = await fetch(`/api/rooms/availability?${params.toString()}`, {
      headers: authHeader,
      cache: "no-store",
    });

    const payload = await response.json().catch(() => ({}));
    setAvailabilityLoading(false);

    if (!response.ok) {
      if (response.status === 401) {
        setAvailabilityError("Your admin session expired. Please login again.");
        return;
      }

      setAvailabilityError(payload.message ?? "Failed to load public availability");
      return;
    }

    const rooms = (payload.results ?? []) as AvailabilityRoom[];
    setAvailabilityRooms(rooms);
    setSelectedAvailabilityRoomId(rooms[0]?.id ?? "");
    setAvailabilityDetailExpanded(rooms.length > 0);
  }

  async function loadDetailedBookings() {
    const authHeader = requireAuthHeader();
    if (!authHeader) {
      return;
    }

    setBookingsLoading(true);
    setBookingsError("");

    const response = await fetch("/api/admin/bookings", {
      headers: authHeader,
      cache: "no-store",
    });

    const payload = await response.json().catch(() => ({}));
    setBookingsLoading(false);

    if (!response.ok) {
      if (response.status === 401) {
        setBookingsError("Your admin session expired. Please login again.");
        return;
      }

      setBookingsError(payload.message ?? "Failed to load booking details");
      return;
    }

    setDetailedBookings((payload.bookings ?? []) as DetailedBooking[]);
    if (!selectedBookingId && Array.isArray(payload.bookings) && payload.bookings.length > 0) {
      setSelectedBookingId(String(payload.bookings[0]._id ?? ""));
    }
  }

  async function cancelBooking(bookingId: string) {
    const authHeader = requireAuthHeader();
    if (!authHeader) {
      return;
    }

    setBookingActionLoading(true);
    setBookingsError("");

    const response = await fetch(`/api/admin/bookings/${bookingId}/cancel`, {
      method: "POST",
      headers: authHeader,
    });

    const payload = await response.json().catch(() => ({}));
    setBookingActionLoading(false);

    if (!response.ok) {
      if (response.status === 401) {
        setBookingsError("Your admin session expired. Please login again.");
        return;
      }

      setBookingsError(payload.message ?? "Failed to cancel booking");
      return;
    }

    await loadDetailedBookings();
  }

  async function deleteBooking(bookingId: string) {
    const authHeader = requireAuthHeader();
    if (!authHeader) {
      return;
    }

    const shouldDelete = window.confirm("Delete this booking and its payment records permanently?");
    if (!shouldDelete) {
      return;
    }

    setBookingActionLoading(true);
    setBookingsError("");

    const response = await fetch(`/api/admin/bookings/${bookingId}`, {
      method: "DELETE",
      headers: authHeader,
    });

    const payload = await response.json().catch(() => ({}));
    setBookingActionLoading(false);

    if (!response.ok) {
      if (response.status === 401) {
        setBookingsError("Your admin session expired. Please login again.");
        return;
      }

      setBookingsError(payload.message ?? "Failed to delete booking");
      return;
    }

    const remaining = detailedBookings.filter((booking) => booking._id !== bookingId);
    setDetailedBookings(remaining);
    setSelectedBookingId(remaining[0]?._id ?? "");
  }

  const selectedAvailabilityRoom = availabilityRooms.find((room) => room.id === selectedAvailabilityRoomId) ?? null;

  function toggleAvailabilityDetail(roomId: string) {
    if (selectedAvailabilityRoomId === roomId) {
      setAvailabilityDetailExpanded((value) => !value);
      return;
    }

    setSelectedAvailabilityRoomId(roomId);
    setAvailabilityDetailExpanded(true);
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <h1 className="mb-2 text-3xl font-black text-slate-900">Admin Analytics</h1>
      <p className="mb-6 text-slate-600">Revenue breakdown and operational metrics from Booking, Payment, and Room data.</p>

      <section className="mb-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-[220px_180px_180px_auto] md:items-end">
        <label className="grid gap-1 text-sm font-semibold text-slate-700">
          Date Preset
          <select className="rounded-lg border border-slate-300 px-3 py-2" value={preset} onChange={(e) => setPreset(e.target.value)}>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="ytd">Year to Date</option>
            <option value="custom">Custom</option>
          </select>
        </label>

        <label className="grid gap-1 text-sm font-semibold text-slate-700">
          From
          <input className="rounded-lg border border-slate-300 px-3 py-2" type="date" value={from} onChange={(e) => setFrom(e.target.value)} disabled={preset !== "custom"} />
        </label>

        <label className="grid gap-1 text-sm font-semibold text-slate-700">
          To
          <input className="rounded-lg border border-slate-300 px-3 py-2" type="date" value={to} onChange={(e) => setTo(e.target.value)} disabled={preset !== "custom"} />
        </label>

        <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" onClick={loadAnalytics} disabled={loading}>
          {loading ? "Loading..." : "Refresh Analytics"}
        </button>
      </section>

      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Public Room Availability Checker</h3>
            <p className="text-sm text-slate-600">Preview what public users can book for selected date, nights, and guests.</p>
          </div>
          <button
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            onClick={loadAvailabilityPreview}
            disabled={availabilityLoading}
          >
            {availabilityLoading ? "Checking..." : "Check Availability"}
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            Arrival Date
            <input
              className="rounded-lg border border-slate-300 px-3 py-2"
              type="date"
              value={availabilityDate}
              onChange={(e) => setAvailabilityDate(e.target.value)}
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            Nights
            <input
              className="rounded-lg border border-slate-300 px-3 py-2"
              type="number"
              min={1}
              value={availabilityNights}
              onChange={(e) => setAvailabilityNights(Math.max(Number(e.target.value) || 1, 1))}
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            Guests
            <input
              className="rounded-lg border border-slate-300 px-3 py-2"
              type="number"
              min={1}
              value={availabilityGuests}
              onChange={(e) => setAvailabilityGuests(Math.max(Number(e.target.value) || 1, 1))}
            />
          </label>
        </div>

        {availabilityError ? <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{availabilityError}</p> : null}

        <div className="mt-4 grid gap-2">
          <p className="text-sm text-slate-600">{availabilityRooms.length} room(s) available for public booking.</p>
          {availabilityRooms.map((room) => (
            <div key={room.id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p>
                  <span className="font-semibold text-slate-900">Room {room.roomNumber}</span> | Room ID: {room.id} | Type: {room.type?.name ?? "N/A"} ({room.type?.code ?? "-"}) | Capacity: {room.capacity} | Bed Only: {formatCurrency(room.pricing?.BED_ONLY?.total ?? 0)} | B&B: {formatCurrency(room.pricing?.BED_BREAKFAST?.total ?? 0)}
                </p>
                <button
                  type="button"
                  className="rounded-md border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-800"
                  onClick={() => toggleAvailabilityDetail(room.id)}
                >
                  {selectedAvailabilityRoomId === room.id && availabilityDetailExpanded ? "Fold Up" : "Detail"}
                </button>
              </div>
            </div>
          ))}
        </div>

        {selectedAvailabilityRoom && availabilityDetailExpanded ? (
          <section className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <p className="text-base font-bold text-slate-900">Selected Room Detail</p>
            <p><strong>Room ID:</strong> {selectedAvailabilityRoom.id}</p>
            <p><strong>Room Number:</strong> {selectedAvailabilityRoom.roomNumber}</p>
            <p><strong>Type:</strong> {selectedAvailabilityRoom.type?.name ?? "N/A"} ({selectedAvailabilityRoom.type?.code ?? "-"})</p>
            <p><strong>Capacity:</strong> {selectedAvailabilityRoom.capacity}</p>

            <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
              <p className="mb-1 font-semibold text-slate-900">Bed Only Pricing</p>
              <p><strong>Per Night:</strong> {formatCurrency(selectedAvailabilityRoom.pricing?.BED_ONLY?.perNight ?? 0)}</p>
              <p><strong>Addons:</strong> {formatCurrency(selectedAvailabilityRoom.pricing?.BED_ONLY?.addons ?? 0)}</p>
              <p><strong>Subtotal:</strong> {formatCurrency(selectedAvailabilityRoom.pricing?.BED_ONLY?.subtotal ?? 0)}</p>
              <p><strong>Taxes:</strong> {formatCurrency(selectedAvailabilityRoom.pricing?.BED_ONLY?.taxes ?? 0)}</p>
              <p><strong>Total:</strong> {formatCurrency(selectedAvailabilityRoom.pricing?.BED_ONLY?.total ?? 0)}</p>
            </div>

            <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
              <p className="mb-1 font-semibold text-slate-900">Bed & Breakfast Pricing</p>
              <p><strong>Per Night:</strong> {formatCurrency(selectedAvailabilityRoom.pricing?.BED_BREAKFAST?.perNight ?? 0)}</p>
              <p><strong>Addons:</strong> {formatCurrency(selectedAvailabilityRoom.pricing?.BED_BREAKFAST?.addons ?? 0)}</p>
              <p><strong>Subtotal:</strong> {formatCurrency(selectedAvailabilityRoom.pricing?.BED_BREAKFAST?.subtotal ?? 0)}</p>
              <p><strong>Taxes:</strong> {formatCurrency(selectedAvailabilityRoom.pricing?.BED_BREAKFAST?.taxes ?? 0)}</p>
              <p><strong>Total:</strong> {formatCurrency(selectedAvailabilityRoom.pricing?.BED_BREAKFAST?.total ?? 0)}</p>
            </div>
          </section>
        ) : null}
      </section>

      {error ? <p className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      {analytics ? (
        <>
          <section className="mb-6 grid gap-4 md:grid-cols-4">
            <article className="rounded-2xl bg-slate-900 p-5 text-white shadow">
              <p className="text-xs uppercase tracking-wide text-slate-300">Net Revenue</p>
              <p className="mt-2 text-2xl font-black">{formatCurrency(analytics.metrics.netRevenue)}</p>
            </article>
            <article className="rounded-2xl bg-white p-5 shadow">
              <p className="text-xs uppercase tracking-wide text-slate-500">Occupancy Rate</p>
              <p className="mt-2 text-2xl font-black text-slate-900">{analytics.metrics.occupancyRate.toFixed(2)}%</p>
            </article>
            <article className="rounded-2xl bg-white p-5 shadow">
              <p className="text-xs uppercase tracking-wide text-slate-500">Revenue per Room</p>
              <p className="mt-2 text-2xl font-black text-slate-900">{formatCurrency(analytics.metrics.revenuePerRoom)}</p>
            </article>
            <article className="rounded-2xl bg-white p-5 shadow">
              <p className="text-xs uppercase tracking-wide text-slate-500">Active Rooms</p>
              <p className="mt-2 text-2xl font-black text-slate-900">{analytics.metrics.activeRooms}</p>
            </article>
          </section>

          <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-lg font-bold text-slate-900">Booking States</h3>
            <div className="grid gap-2 md:grid-cols-3">
              {analytics.bookingStates.length === 0 ? <p className="text-sm text-slate-500">No bookings in selected range.</p> : null}
              {analytics.bookingStates.map((state) => (
                <div key={state._id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  <span className="font-semibold text-slate-900">{state._id}</span>: {state.count}
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <RevenueTable title="Daily Revenue" rows={analytics.revenue.daily} />
            <RevenueTable title="Weekly Revenue" rows={analytics.revenue.weekly} />
            <RevenueTable title="Monthly Revenue" rows={analytics.revenue.monthly} />
            <RevenueTable title="Yearly Revenue" rows={analytics.revenue.yearly} />
          </section>
        </>
      ) : null}

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Detailed Customer Bookings</h3>
            <p className="text-sm text-slate-600">Includes booking ID, room ID, room number, customer profile, and stay details.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800"
              onClick={() => setDetailedBookingsExpanded((value) => !value)}
              type="button"
            >
              {detailedBookingsExpanded ? "Fold Up" : "Fold Down"}
            </button>
            <button
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              onClick={loadDetailedBookings}
              disabled={bookingsLoading}
            >
              {bookingsLoading ? "Loading..." : "Load Booking Details"}
            </button>
          </div>
        </div>

        {!detailedBookingsExpanded ? <p className="text-sm text-slate-500">Detailed bookings are folded. Click Fold Down to expand.</p> : null}

        {detailedBookingsExpanded ? (
          <>
            {bookingsError ? <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{bookingsError}</p> : null}

            <div className="grid gap-3">
              {detailedBookings.map((booking) => (
                <article
                  key={booking._id}
                  className={`cursor-pointer rounded-xl border p-4 transition ${selectedBookingId === booking._id ? "border-slate-900 bg-slate-50" : "border-slate-200"}`}
                  onClick={() => setSelectedBookingId(booking._id)}
                >
                  <p className="font-semibold text-slate-900">
                    Booking ID: {booking._id} | Ref: {booking.bookingRef} | Status: {booking.status} | Payment: {booking.paymentStatus ?? "PENDING"}
                  </p>
                  <p className="mt-1 text-sm text-slate-700">
                    Room ID: {booking.roomId} | Room Number: {booking.room?.roomNumber ?? "Unknown"} | Room Status: {booking.room?.status ?? "N/A"}
                  </p>
                  <p className="mt-1 text-sm text-slate-700">
                    Customer: {booking.customer?.name ?? booking.guestSnapshot?.fullName ?? "Unknown"} ({booking.customer?.email ?? booking.guestSnapshot?.email ?? "N/A"}) | Phone: {booking.customer?.phone ?? booking.guestSnapshot?.phone ?? "N/A"}
                  </p>
                  <p className="mt-1 text-sm text-slate-700">
                    Stay: {new Date(booking.arrivalDate).toLocaleDateString()} to {new Date(booking.departureDate).toLocaleDateString()} | Plan: {booking.pricingPlan} | Total: {formatCurrency(booking.totalPrice)}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">Click to view full booking detail and actions.</p>
                </article>
              ))}

              {!bookingsLoading && detailedBookings.length === 0 ? (
                <p className="text-sm text-slate-500">No booking details loaded yet. Click &quot;Load Booking Details&quot;.</p>
              ) : null}
            </div>

            {selectedBookingId ? (
              <section className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                {(() => {
                  const booking = detailedBookings.find((item) => item._id === selectedBookingId);
                  if (!booking) {
                    return <p className="text-sm text-slate-600">Select a booking to view details.</p>;
                  }

                  return (
                <div className="grid gap-3 text-sm text-slate-700">
                  <p className="text-base font-bold text-slate-900">Selected Booking Detail</p>
                  <p><strong>Booking ID:</strong> {booking._id}</p>
                  <p><strong>Booking Ref:</strong> {booking.bookingRef}</p>
                  <p><strong>Status:</strong> {booking.status}</p>
                  <p><strong>Payment Status:</strong> {booking.paymentStatus ?? "PENDING"}</p>
                  <p><strong>Room ID:</strong> {booking.roomId}</p>
                  <p><strong>Room Number:</strong> {booking.room?.roomNumber ?? "Unknown"}</p>
                  <p><strong>Room Status:</strong> {booking.room?.status ?? "N/A"}</p>
                  <p><strong>Arrival:</strong> {new Date(booking.arrivalDate).toLocaleDateString()}</p>
                  <p><strong>Departure:</strong> {new Date(booking.departureDate).toLocaleDateString()}</p>
                  <p><strong>Nights:</strong> {booking.nights ?? "N/A"}</p>
                  <p><strong>Plan:</strong> {booking.pricingPlan}</p>
                  <p><strong>Total:</strong> {formatCurrency(booking.totalPrice)}</p>
                  <p><strong>Amount Paid:</strong> {formatCurrency(booking.amountPaid ?? 0)}</p>
                  <p><strong>Per Night:</strong> {formatCurrency(booking.pricing?.perNight ?? 0)}</p>
                  <p><strong>Addons:</strong> {formatCurrency(booking.pricing?.addons ?? 0)}</p>
                  <p><strong>Subtotal:</strong> {formatCurrency(booking.pricing?.subtotal ?? 0)}</p>
                  <p><strong>Taxes:</strong> {formatCurrency(booking.pricing?.taxes ?? 0)}</p>

                  <div className="mt-2 rounded-lg border border-slate-200 bg-white p-3">
                    <p className="mb-2 font-semibold text-slate-900">Step 3: Guest Information</p>
                    <p><strong>Guest Name:</strong> {booking.guestSnapshot?.fullName ?? "N/A"}</p>
                    <p><strong>Guest Email:</strong> {booking.guestSnapshot?.email ?? "N/A"}</p>
                    <p><strong>Guest Phone:</strong> {booking.guestSnapshot?.phone ?? "N/A"}</p>
                    <p><strong>Guest ID Document:</strong> {booking.guestSnapshot?.identityDocumentUrl ?? "N/A"}</p>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="mb-2 font-semibold text-slate-900">Step 4: Account Information</p>
                    <p><strong>Account Name:</strong> {booking.customer?.name ?? booking.guestSnapshot?.fullName ?? "Unknown"}</p>
                    <p><strong>Account Email:</strong> {booking.customer?.email ?? booking.guestSnapshot?.email ?? "N/A"}</p>
                    <p><strong>Account Phone:</strong> {booking.customer?.phone ?? booking.guestSnapshot?.phone ?? "N/A"}</p>
                    <p><strong>Account Role:</strong> {booking.customer?.role ?? "CUSTOMER"}</p>
                    <p><strong>Sign-In Provider:</strong> {booking.customer?.provider ?? "local"}</p>
                    <p><strong>Identity Type:</strong> {booking.customer?.identityType ?? "passport"}</p>
                    <p><strong>Account ID Document:</strong> {booking.customer?.passportDocumentUrl ?? booking.guestSnapshot?.identityDocumentUrl ?? "N/A"}</p>
                  </div>

                  {booking.createdAt ? <p><strong>Created At:</strong> {new Date(booking.createdAt).toLocaleString()}</p> : null}
                  {booking.checkInAt ? <p><strong>Checked In:</strong> {new Date(booking.checkInAt).toLocaleString()}</p> : null}
                  {booking.checkOutAt ? <p><strong>Checked Out:</strong> {new Date(booking.checkOutAt).toLocaleString()}</p> : null}
                  {booking.cancelledAt ? <p><strong>Cancelled At:</strong> {new Date(booking.cancelledAt).toLocaleString()}</p> : null}

                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                      onClick={() => cancelBooking(booking._id)}
                      disabled={bookingActionLoading}
                    >
                      {bookingActionLoading ? "Working..." : "Cancel Booking"}
                    </button>
                    <button
                      className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                      onClick={() => deleteBooking(booking._id)}
                      disabled={bookingActionLoading}
                    >
                      {bookingActionLoading ? "Working..." : "Delete Booking Detail"}
                    </button>
                  </div>
                </div>
                  );
                })()}
              </section>
            ) : null}
          </>
        ) : null}
      </section>
    </main>
  );
}
