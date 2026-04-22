"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RoleGate } from "@/components/auth/RoleGate";

type CustomerProfile = {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  passportDocumentUrl?: string;
};

type CustomerBooking = {
  _id: string;
  bookingRef: string;
  pricingPlan: string;
  guests: {
    adults: number;
    children: number;
  };
  guestSnapshot: {
    fullName: string;
    email: string;
    phone?: string;
    identityDocumentUrl?: string;
  };
  status: string;
  paymentStatus: string;
  pricing: {
    perNight: number;
    addons: number;
    subtotal: number;
    taxes: number;
    total: number;
    currency: string;
  };
  totalPrice: number;
  amountPaid: number;
  arrivalDate: string;
  departureDate: string;
  nights: number;
  checkInAt?: string;
  checkOutAt?: string;
  cancelledAt?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
  room: {
    id: string;
    roomNumber: string;
    status: string;
    type?: {
      id: string;
      name: string;
      code: string;
    } | null;
  } | null;
  latestPayment: {
    _id: string;
    status: string;
    method: string;
    amount: number;
    transactionReference?: string;
    receiptUrl?: string;
    createdAt?: string;
    reviewNote?: string;
    reviewedAt?: string;
  } | null;
  paymentHistory: Array<{
    _id: string;
    status: string;
    method: string;
    amount: number;
    transactionReference?: string;
    receiptUrl?: string;
    createdAt?: string;
    reviewNote?: string;
    reviewedAt?: string;
  }>;
};

function PaymentBadge({ status }: { status: string }) {
  const style =
    status === "REJECTED"
      ? "bg-red-100 text-red-700"
      : status === "APPROVED" || status === "PAID" || status === "PARTIAL"
        ? "bg-emerald-100 text-emerald-700"
        : "bg-amber-100 text-amber-700";

  return <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${style}`}>{status}</span>;
}

export default function CustomerPage() {
  return (
    <RoleGate allow={["CUSTOMER"]} loginRoute="/auth/customer-signin">
      <CustomerPortalContent />
    </RoleGate>
  );
}

function CustomerPortalContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [bookings, setBookings] = useState<CustomerBooking[]>([]);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState("");
  const [showPaymentPanel, setShowPaymentPanel] = useState(false);
  const [manualMethod, setManualMethod] = useState<"bank" | "mobile_money">("bank");
  const [transactionReference, setTransactionReference] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const paymentPanelRef = useRef<HTMLDivElement | null>(null);
  const paymentStepRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      const token = localStorage.getItem("hotel_saas_token")?.trim() ?? "";
      if (!token) {
        if (active) {
          setError("Missing login token. Please sign in again.");
          setLoading(false);
        }
        return;
      }

      const [bookingsResponse, profileResponse] = await Promise.all([
        fetch("/api/customer/bookings", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }),
        fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }),
      ]);

      const bookingsPayload = await bookingsResponse.json().catch(() => ({}));
      const profilePayload = await profileResponse.json().catch(() => ({}));
      if (!active) {
        return;
      }

      if (!bookingsResponse.ok) {
        setError(bookingsPayload.message ?? "Failed to load your bookings");
        setLoading(false);
        return;
      }

      const normalizedBookings = (bookingsPayload.bookings ?? []) as CustomerBooking[];
      const sessionBookingId = sessionStorage.getItem("booking_progress_booking_id")?.trim() ?? "";
      const requestedBookingId = searchParams.get("bookingId")?.trim() || sessionBookingId;
      const hasRequestedBooking = requestedBookingId && normalizedBookings.some((booking) => booking._id === requestedBookingId);
      setBookings(normalizedBookings);
      setSelectedBookingId(hasRequestedBooking ? requestedBookingId : normalizedBookings[0]?._id ?? "");
      const continueFromSession = sessionStorage.getItem("booking_progress_continue_payment") === "1";
      setShowPaymentPanel(searchParams.get("continuePayment") === "1" || continueFromSession);

      if (profileResponse.ok && profilePayload?.user) {
        setProfile(profilePayload.user as CustomerProfile);
      }

      setLoading(false);
    }

    load();
    return () => {
      active = false;
    };
  }, [searchParams]);

  const selectedBooking = bookings.find((booking) => booking._id === selectedBookingId) ?? null;

  async function uploadReceiptIfNeeded() {
    if (!receiptFile) {
      return "";
    }

    const form = new FormData();
    form.append("file", receiptFile);

    const uploadRes = await fetch("/api/uploads/payment-receipt", {
      method: "POST",
      body: form,
    });

    const uploadData = await uploadRes.json().catch(() => ({}));
    if (!uploadRes.ok) {
      throw new Error(uploadData.message ?? "Failed to upload receipt");
    }

    return String(uploadData.url ?? "");
  }

  async function submitPaymentForSelectedBooking() {
    if (!selectedBooking?._id) {
      return;
    }

    if (!transactionReference.trim() && !receiptFile) {
      setError("Please provide transaction reference or upload receipt.");
      return;
    }

    setSubmittingPayment(true);
    setError("");

    try {
      const receiptUrl = await uploadReceiptIfNeeded();
      const amount = Number(selectedBooking.pricing?.total ?? selectedBooking.totalPrice ?? 0);

      const response = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: selectedBooking._id,
          bookingRef: selectedBooking.bookingRef,
          amount,
          method: manualMethod,
          transactionReference: transactionReference.trim() || undefined,
          receiptUrl: receiptUrl || undefined,
          status: "PENDING",
          idempotencyKey: crypto.randomUUID(),
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.message ?? "Failed to submit payment");
      }

      router.push(`/booking/confirmation/${selectedBooking._id}`);
    } catch (submissionError) {
      const message = submissionError instanceof Error ? submissionError.message : "Failed to submit payment";
      setError(message);
    } finally {
      setSubmittingPayment(false);
    }
  }

  const isUnfinishedBooking = !!selectedBooking && !["CHECKED_OUT", "CANCELLED"].includes(selectedBooking.status);
  const hasSubmittedPayment =
    !!selectedBooking?.latestPayment?._id ||
    (selectedBooking?.paymentHistory?.length ?? 0) > 0;
  const canStartFirstPayment = !!selectedBooking && !hasSubmittedPayment;
  const isRejectedByAdmin = selectedBooking?.latestPayment?.status === "REJECTED" || selectedBooking?.paymentStatus === "REJECTED";

  const needsPayment = isUnfinishedBooking && (canStartFirstPayment || isRejectedByAdmin);

  const canContinuePayment = !!selectedBooking && isUnfinishedBooking && (canStartFirstPayment || isRejectedByAdmin);

  function openPaymentAndScroll() {
    setShowPaymentPanel(true);

    requestAnimationFrame(() => {
      const target = paymentPanelRef.current ?? paymentStepRef.current;
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  useEffect(() => {
    if (!showPaymentPanel) {
      return;
    }

    const node = paymentPanelRef.current;
    if (!node) {
      return;
    }

    requestAnimationFrame(() => {
      node.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [selectedBookingId, showPaymentPanel]);

  return (
    <>
          <h1 className="text-3xl font-black text-slate-900">Customer Dashboard</h1>
          <p className="mt-2 text-slate-600">After login, view your profile and full booking flow details from selection to confirmation.</p>

          {loading ? <p className="mt-6 text-sm text-slate-600">Loading your dashboard...</p> : null}
          {error ? <p className="mt-6 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

          <section id="profile" className="mt-6 scroll-mt-24 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">Customer Profile</h2>
            {profile ? (
              <div className="mt-3 grid gap-1 text-sm text-slate-700">
                <p><strong>Name:</strong> {profile.name}</p>
                <p><strong>Email:</strong> {profile.email}</p>
                <p><strong>Phone:</strong> {profile.phone ?? "N/A"}</p>
                <p><strong>Role:</strong> {profile.role}</p>
                <p><strong>Identity Document:</strong> {profile.passportDocumentUrl ?? "N/A"}</p>
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-600">Profile information is unavailable right now.</p>
            )}
          </section>

          <section id="bookings" className="mt-6 scroll-mt-24 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">My Bookings</h2>
            {!loading && !error && bookings.length === 0 ? <p className="mt-3 text-sm text-slate-600">No bookings found for your account yet.</p> : null}

            <div className="mt-3 grid gap-2">
              {bookings.map((booking) => (
                <button
                  key={booking._id}
                  type="button"
                  onClick={() => {
                    setSelectedBookingId(booking._id);
                    setShowPaymentPanel(false);
                  }}
                  className={`rounded-lg border px-3 py-3 text-left transition ${selectedBookingId === booking._id ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"}`}
                >
                  <p className="font-semibold">{booking.bookingRef} - Room {booking.room?.roomNumber ?? "N/A"}</p>
                  <p className={`text-xs ${selectedBookingId === booking._id ? "text-slate-200" : "text-slate-500"}`}>
                    {new Date(booking.arrivalDate).toLocaleDateString()} - {new Date(booking.departureDate).toLocaleDateString()} | Payment {booking.paymentStatus}
                  </p>
                  <p className={`mt-1 text-xs font-semibold ${selectedBookingId === booking._id ? "text-emerald-200" : "text-emerald-700"}`}>
                    {booking.status === "PENDING" ? "Reserved" : booking.status}
                  </p>
                </button>
              ))}
            </div>

            {selectedBooking && needsPayment && canContinuePayment ? (
              <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                <p><strong>Reserved:</strong> Click continue payment to complete Step 5 and Step 6 confirmation.</p>
                <button
                  type="button"
                  className="mt-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white"
                  onClick={openPaymentAndScroll}
                >
                  Continue Payment
                </button>
              </div>
            ) : null}
          </section>

          <section id="journey" className="mt-6 scroll-mt-24 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">Booking Journey (Step 1-6)</h2>

            {!selectedBooking ? <p className="mt-3 text-sm text-slate-600">Select a booking to view your full journey details.</p> : null}

            {selectedBooking ? (
              <div className="mt-4 grid gap-4 text-sm text-slate-700">
                <article ref={paymentStepRef} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="font-semibold text-slate-900">Step 1: Booking Details</p>
                  <p><strong>Arrival:</strong> {new Date(selectedBooking.arrivalDate).toLocaleDateString()}</p>
                  <p><strong>Nights:</strong> {selectedBooking.nights}</p>
                  <p><strong>Guests:</strong> {selectedBooking.guests.adults} adult(s), {selectedBooking.guests.children} child(ren)</p>
                </article>

                <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="font-semibold text-slate-900">Step 2: Room Selection</p>
                  <p><strong>Room Number:</strong> {selectedBooking.room?.roomNumber ?? "N/A"}</p>
                  <p><strong>Room Type:</strong> {selectedBooking.room?.type?.name ?? "N/A"} {selectedBooking.room?.type?.code ? `(${selectedBooking.room.type.code})` : ""}</p>
                  <p><strong>Pricing Plan:</strong> {selectedBooking.pricingPlan}</p>
                </article>

                <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="font-semibold text-slate-900">Step 3: Guest Information</p>
                  <p><strong>Full Name:</strong> {selectedBooking.guestSnapshot.fullName}</p>
                  <p><strong>Email:</strong> {selectedBooking.guestSnapshot.email}</p>
                  <p><strong>Phone:</strong> {selectedBooking.guestSnapshot.phone ?? "N/A"}</p>
                  <p><strong>ID Document:</strong> {selectedBooking.guestSnapshot.identityDocumentUrl ?? "N/A"}</p>
                </article>

                <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="font-semibold text-slate-900">Step 4: Account Information</p>
                  <p><strong>Account Name:</strong> {profile?.name ?? "N/A"}</p>
                  <p><strong>Account Email:</strong> {profile?.email ?? "N/A"}</p>
                  <p><strong>Account Phone:</strong> {profile?.phone ?? "N/A"}</p>
                </article>

                <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="font-semibold text-slate-900">Step 5: Payment</p>
                  <p><strong>Total:</strong> ${selectedBooking.pricing.total.toFixed(2)} {selectedBooking.pricing.currency}</p>
                  <p><strong>Paid:</strong> ${selectedBooking.amountPaid.toFixed(2)}</p>
                  <p><strong>Latest Payment:</strong> <PaymentBadge status={selectedBooking.latestPayment?.status ?? "PENDING"} /></p>
                  {selectedBooking.latestPayment?.transactionReference ? <p><strong>Reference:</strong> {selectedBooking.latestPayment.transactionReference}</p> : null}

                  {showPaymentPanel && needsPayment && canContinuePayment ? (
                    <div ref={paymentPanelRef} className="mt-3 grid gap-3 rounded-lg border border-slate-300 bg-white p-3">
                      <p className="text-xs text-slate-600">Pay from this page by submitting receipt or transaction reference.</p>

                      <label className="grid gap-1 text-sm font-semibold text-slate-700">
                        Payment Method
                        <select
                          className="rounded-lg border border-slate-300 px-3 py-2"
                          value={manualMethod}
                          onChange={(e) => setManualMethod(e.target.value as "bank" | "mobile_money")}
                        >
                          <option value="bank">Bank Transfer</option>
                          <option value="mobile_money">Mobile Money (Telebirr / M-Pesa)</option>
                        </select>
                      </label>

                      <label className="grid gap-1 text-sm font-semibold text-slate-700">
                        Transaction Reference
                        <input
                          className="rounded-lg border border-slate-300 px-3 py-2"
                          placeholder="TRX-123456"
                          value={transactionReference}
                          onChange={(e) => setTransactionReference(e.target.value)}
                        />
                      </label>

                      <label className="grid gap-1 text-sm font-semibold text-slate-700">
                        Receipt File (image/pdf)
                        <input
                          className="rounded-lg border border-slate-300 px-3 py-2"
                          type="file"
                          accept="image/jpeg,image/png,application/pdf"
                          onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
                        />
                      </label>

                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                          onClick={submitPaymentForSelectedBooking}
                          disabled={submittingPayment}
                        >
                          {submittingPayment ? "Submitting..." : "Submit Payment & Continue Confirmation"}
                        </button>

                        <button
                          type="button"
                          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800"
                          onClick={() => router.push(`/booking/confirmation/${selectedBooking._id}`)}
                        >
                          Go to Confirmation
                        </button>
                      </div>
                    </div>
                  ) : null}
                </article>

                <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="font-semibold text-slate-900">Step 6: Confirmation</p>
                  <p><strong>Booking Ref:</strong> {selectedBooking.bookingRef}</p>
                  <p><strong>Booking Status:</strong> {selectedBooking.status}</p>
                  <p><strong>Payment Status:</strong> {selectedBooking.paymentStatus}</p>
                  <p><strong>Created At:</strong> {new Date(selectedBooking.createdAt).toLocaleString()}</p>
                </article>
              </div>
            ) : null}
          </section>
    </>
  );
}
