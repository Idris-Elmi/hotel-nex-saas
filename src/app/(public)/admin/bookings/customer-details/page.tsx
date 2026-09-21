"use client";

import { useState } from "react";
import { RoleGate } from "@/components/auth/RoleGate";
import { triggerAnalyticsRefresh } from "@/lib/analyticsRefresh";

type DetailedBooking = {
  _id: string;
  bookingRef: string;
  status: string;
  paymentStatus?: string;
  pricingPlan: string;
  guests?: { adults?: number; children?: number };
  arrivalDate: string;
  departureDate: string;
  nights?: number;
  totalPrice: number;
  amountPaid?: number;
  pricing?: {
    perNight?: number; addons?: number; subtotal?: number; taxes?: number; total?: number; currency?: string;
  };
  roomId: string;
  room: { _id: string; roomNumber: string; status?: string } | null;
  customer: {
    _id: string; name: string; email: string; phone?: string; role?: string;
    identityType?: string; passportDocumentUrl?: string; provider?: string;
  } | null;
  guestSnapshot?: {
    fullName?: string; email?: string; phone?: string; identityDocumentUrl?: string;
  };
  createdAt?: string;
  checkInAt?: string;
  checkOutAt?: string;
  cancelledAt?: string;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "ETB", maximumFractionDigits: 2,
  }).format(value);
}

function getAuthHeaders() {
  const token = sessionStorage.getItem("hotel_saas_token_staff")?.trim() ?? "";
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

export default function CustomerDetailsPage({ apiBase }: { apiBase?: string } = {}) {
  return (
    <RoleGate allow={["OWNER", "ADMIN"]} loginRoute="/auth/staff-signin">
      <CustomerDetailsContent apiBase={apiBase} />
    </RoleGate>
  );
}

function CustomerDetailsContent({ apiBase = "/api/admin" }: { apiBase?: string }) {
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingsError, setBookingsError] = useState("");
  const [detailedBookings, setDetailedBookings] = useState<DetailedBooking[]>([]);
  const [selectedBookingId, setSelectedBookingId] = useState("");
  const [expanded, setExpanded] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState("");

  async function loadDetailedBookings() {
    setBookingsLoading(true);
    setBookingsError("");
    const response = await fetch(`${apiBase}/bookings`, {
      headers: getAuthHeaders(),
      cache: "no-store",
    });
    const payload = await response.json().catch(() => ({}));
    setBookingsLoading(false);
    if (!response.ok) {
      setBookingsError(payload.message ?? "Failed to load booking details");
      return;
    }
    const bookings = (payload.bookings ?? []) as DetailedBooking[];
    setDetailedBookings(bookings);
    if (!selectedBookingId && bookings.length > 0) {
      setSelectedBookingId(bookings[0]._id);
    }
  }

  async function cancelBooking(bookingId: string) {
    setActionLoading(`cancel-${bookingId}`);
    setBookingsError("");
    try {
      const res = await fetch(`${apiBase}/bookings/${bookingId}/cancel`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Failed to cancel booking");
      await loadDetailedBookings();
      triggerAnalyticsRefresh();
    } catch (err: unknown) {
      setBookingsError(err instanceof Error ? err.message : "Cancel failed");
    } finally {
      setActionLoading("");
    }
  }

  async function deleteBooking(bookingId: string) {
    setActionLoading(`delete-${bookingId}`);
    setBookingsError("");
    try {
      const res = await fetch(`${apiBase}/bookings/${bookingId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Failed to delete booking");
      setDeleteConfirmId("");
      if (selectedBookingId === bookingId) setSelectedBookingId("");
      await loadDetailedBookings();
      triggerAnalyticsRefresh();
    } catch (err: unknown) {
      setBookingsError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setActionLoading("");
    }
  }

  return (
    <main className="min-h-screen max-w-6xl mx-auto">
      <h1 className="text-2xl font-serif font-bold text-slate-900 dark:text-slate-100 mb-6">Customer Booking Details</h1>

      <section className="rounded-2xl border border-slate-200 dark:border-[#1E2D4A] bg-white dark:bg-[#0F1629] p-5 shadow-sm transition-all duration-200">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-serif font-semibold text-slate-900 dark:text-slate-100">Detailed Customer Bookings</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">Includes booking ID, room ID, room number, customer profile, and stay details.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-xl border border-slate-300 dark:border-[#1E2D4A] px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1A2540] transition-all duration-200"
              onClick={() => setExpanded((v) => !v)}
              type="button"
            >
              {expanded ? "Fold Up" : "Fold Down"}
            </button>
            <button
              className="rounded-xl bg-indigo-600 dark:bg-indigo-700 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-60 transition-all duration-200"
              onClick={loadDetailedBookings}
              disabled={bookingsLoading}
              type="button"
            >
              {bookingsLoading ? "Loading..." : "Load Booking Details"}
            </button>
          </div>
        </div>

        {!expanded ? <p className="text-sm text-slate-500 dark:text-slate-400">Detailed bookings are folded. Click Fold Down to expand.</p> : null}

        {expanded ? (
          <>
            {bookingsError ? <p className="mb-3 rounded-xl bg-red-50 dark:bg-red-900/20 px-4 py-2.5 text-sm text-red-700 dark:text-red-400">{bookingsError}</p> : null}

            <div className="grid gap-2">
              {detailedBookings.map((booking) => (
                <article
                  key={booking._id}
                  onClick={() => { setSelectedBookingId(booking._id); setDeleteConfirmId(""); }}
                  className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 ${selectedBookingId === booking._id ? "border-indigo-400 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20" : "border-slate-200 dark:border-[#1E2D4A] bg-white dark:bg-[#0F1629] hover:border-slate-300 dark:hover:border-[#252D47]"}`}
                >
                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                    Booking ID: {booking._id} | Ref: {booking.bookingRef} | Status: {booking.status} | Payment: {booking.paymentStatus ?? "PENDING"}
                  </p>
                  <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                    Room ID: {booking.roomId} | Room Number: {booking.room?.roomNumber ?? "Unknown"} | Room Status: {booking.room?.status ?? "N/A"}
                  </p>
                  <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                    Customer: {booking.customer?.name ?? booking.guestSnapshot?.fullName ?? "Unknown"} ({booking.customer?.email ?? booking.guestSnapshot?.email ?? "N/A"}) | Phone: {booking.customer?.phone ?? booking.guestSnapshot?.phone ?? "N/A"}
                  </p>
                  <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                    Stay: {new Date(booking.arrivalDate).toLocaleDateString()} to {new Date(booking.departureDate).toLocaleDateString()} | Plan: {booking.pricingPlan} | Total: {formatCurrency(booking.totalPrice)}
                  </p>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Click to view full booking detail and actions.</p>
                </article>
              ))}
              {!bookingsLoading && detailedBookings.length === 0 ? <p className="text-sm text-slate-500 dark:text-slate-400">No booking details loaded yet.</p> : null}
            </div>

            {selectedBookingId ? (
              <div className="mt-5 rounded-xl border border-slate-200 dark:border-[#1E2D4A] bg-slate-50 dark:bg-[#141829] p-4 text-sm text-slate-700 dark:text-slate-300">
                {(() => {
                  const booking = detailedBookings.find((item) => item._id === selectedBookingId);
                  if (!booking) {
                    return <p className="text-sm text-slate-600 dark:text-slate-400">Select a booking to view details.</p>;
                  }
                  return (
                    <div className="grid gap-3">
                      <p className="text-base font-bold text-slate-900 dark:text-slate-100">Selected Booking Detail</p>
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

                      <div className="mt-2 rounded-xl border border-slate-200 dark:border-[#1E2D4A] bg-white dark:bg-[#0F1629] p-4">
                        <p className="mb-2 font-semibold text-slate-900 dark:text-slate-100">Guest Information</p>
                        <p><strong>Guest Name:</strong> {booking.guestSnapshot?.fullName ?? "N/A"}</p>
                        <p><strong>Guest Email:</strong> {booking.guestSnapshot?.email ?? "N/A"}</p>
                        <p><strong>Guest Phone:</strong> {booking.guestSnapshot?.phone ?? "N/A"}</p>
                        <p>
                          <strong>Guest ID Document:</strong>{" "}
                          {booking.guestSnapshot?.identityDocumentUrl ? (
                            <a href={booking.guestSnapshot.identityDocumentUrl} target="_blank" rel="noreferrer" className="font-semibold text-indigo-600 dark:text-indigo-400 underline">Open ID/Passport File</a>
                          ) : "N/A"}
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-200 dark:border-[#1E2D4A] bg-white dark:bg-[#0F1629] p-4">
                        <p className="mb-2 font-semibold text-slate-900 dark:text-slate-100">Account Information</p>
                        <p><strong>Account Name:</strong> {booking.customer?.name ?? booking.guestSnapshot?.fullName ?? "Unknown"}</p>
                        <p><strong>Account Email:</strong> {booking.customer?.email ?? booking.guestSnapshot?.email ?? "N/A"}</p>
                        <p><strong>Account Phone:</strong> {booking.customer?.phone ?? booking.guestSnapshot?.phone ?? "N/A"}</p>
                        <p><strong>Account Role:</strong> {booking.customer?.role ?? "CUSTOMER"}</p>
                        <p><strong>Sign-In Provider:</strong> {booking.customer?.provider ?? "local"}</p>
                        <p><strong>Identity Type:</strong> {booking.customer?.identityType ?? "passport"}</p>
                        <p><strong>Account ID Document:</strong> {booking.customer?.passportDocumentUrl ?? booking.guestSnapshot?.identityDocumentUrl ?? "N/A"}</p>
                      </div>

                      {booking.createdAt ? <p><strong>Created At:</strong> {new Date(booking.createdAt).toLocaleString()}</p> : null}

                      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-200 dark:border-[#1E2D4A] pt-4">
                        {(booking.status === "PENDING" || booking.status === "CONFIRMED") && (
                          <button
                            onClick={() => cancelBooking(booking._id)}
                            disabled={actionLoading === `cancel-${booking._id}`}
                            className="rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 text-xs font-semibold text-white transition-all duration-200 active:scale-[0.99]"
                          >
                            {actionLoading === `cancel-${booking._id}` ? "Cancelling..." : "Cancel Booking"}
                          </button>
                        )}

                        {deleteConfirmId === booking._id ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">Confirm delete?</span>
                            <button
                              onClick={() => deleteBooking(booking._id)}
                              disabled={actionLoading === `delete-${booking._id}`}
                              className="rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1.5 text-xs font-semibold text-white transition-all duration-200"
                            >
                              {actionLoading === `delete-${booking._id}` ? "..." : "Yes, Delete"}
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId("")}
                              className="rounded-xl border border-slate-300 dark:border-[#1E2D4A] px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#1A2540] transition-all duration-200"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmId(booking._id)}
                            className="rounded-xl border border-red-300 dark:border-red-800 px-4 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
                          >
                            Delete Booking
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : null}
          </>
        ) : null}
      </section>
    </main>
  );
}
