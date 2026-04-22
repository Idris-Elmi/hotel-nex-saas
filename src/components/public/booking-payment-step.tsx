"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type CreatedBooking = {
  _id: string;
  bookingRef: string;
  totalPrice: number;
  pricing?: {
    total?: number;
    currency?: string;
  };
};

type ManualMethod = "bank" | "mobile_money";

const BANK_DETAILS = {
  bankName: "Commercial Bank of Ethiopia",
  accountName: "Aurora Stays PLC",
  accountNumber: "1000123456789",
};

const MOBILE_MONEY_DETAILS = {
  provider: "Telebirr",
  accountName: "Aurora Stays PLC",
  phone: "+251911223344",
};

export function BookingPaymentStep() {
  const params = useSearchParams();
  const router = useRouter();
  const bookingIdFromQuery = params.get("bookingId")?.trim() ?? "";

  const [booking, setBooking] = useState<CreatedBooking | null>(null);
  const [processing, setProcessing] = useState(false);
  const [loadingExistingBooking, setLoadingExistingBooking] = useState(false);
  const [error, setError] = useState("");
  const [manualMethod, setManualMethod] = useState<ManualMethod>("bank");
  const [transactionReference, setTransactionReference] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const payload = useMemo(() => {
    const adults = Number(params.get("adults") ?? "2");
    const children = Number(params.get("children") ?? "0");

    return {
      roomId: params.get("roomId") ?? "",
      arrivalDate: params.get("arrivalDate") ?? "",
      nights: Number(params.get("nights") ?? "1"),
      pricingPlan: (params.get("pricingPlan") ?? "BED_ONLY") as "BED_ONLY" | "BED_BREAKFAST",
      guests: {
        adults: Number.isFinite(adults) && adults > 0 ? adults : 2,
        children: Number.isFinite(children) && children >= 0 ? children : 0,
      },
      guest: {
        fullName: params.get("fullName") ?? "",
        email: params.get("email") ?? "",
        phone: params.get("phone") ?? "",
        identityDocumentUrl: params.get("identityDocumentUrl") ?? "/uploads/ids/placeholder.jpg",
        privacyAccepted: true,
      },
    };
  }, [params]);

  function redirectToCustomerSignIn() {
    const dashboardTarget = `/customer/dashboard?bookingId=${encodeURIComponent(bookingIdFromQuery)}&continuePayment=1`;
    router.replace(`/auth/customer-signin?redirectTo=${encodeURIComponent(dashboardTarget)}`);
  }

  useEffect(() => {
    if (!bookingIdFromQuery || booking) {
      return;
    }

    let active = true;
    setLoadingExistingBooking(true);
    setError("");

    async function loadExistingBooking() {
      const token = localStorage.getItem("hotel_saas_token")?.trim() ?? "";
      if (!token) {
        if (active) {
          setLoadingExistingBooking(false);
          redirectToCustomerSignIn();
        }
        return;
      }

      const response = await fetch("/api/customer/bookings", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      const responsePayload = await response.json().catch(() => ({}));
      if (!active) {
        return;
      }

      if (!response.ok) {
        setLoadingExistingBooking(false);
        if (response.status === 401) {
          redirectToCustomerSignIn();
          return;
        }
        setError(responsePayload.message ?? "Failed to load booking for payment.");
        return;
      }

      const bookings = (responsePayload.bookings ?? []) as Array<{
        _id: string;
        bookingRef: string;
        totalPrice: number;
        pricing?: {
          total?: number;
          currency?: string;
        };
      }>;

      const found = bookings.find((item) => item._id === bookingIdFromQuery);
      if (!found) {
        setLoadingExistingBooking(false);
        setError("Booking not found in your account.");
        return;
      }

      setBooking({
        _id: found._id,
        bookingRef: found.bookingRef,
        totalPrice: found.totalPrice,
        pricing: found.pricing,
      });
      setLoadingExistingBooking(false);
    }

    loadExistingBooking();

    return () => {
      active = false;
    };
  }, [booking, bookingIdFromQuery]);

  async function startPayment() {
    setProcessing(true);
    setError("");

    const bookingRes = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, idempotencyKey: crypto.randomUUID() }),
    });

    const bookingData = await bookingRes.json();
    if (!bookingRes.ok) {
      setProcessing(false);
      setError(bookingData.message ?? "Failed to create booking");
      return;
    }

    setBooking(bookingData.booking);
    setProcessing(false);
  }

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

    const uploadData = await uploadRes.json();
    if (!uploadRes.ok) {
      throw new Error(uploadData.message ?? "Failed to upload receipt");
    }

    return String(uploadData.url ?? "");
  }

  async function submitManualPayment() {
    if (!booking?._id) {
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
      const amount = Number(booking.pricing?.total ?? booking.totalPrice ?? 0);

      const response = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: booking._id,
          bookingRef: booking.bookingRef,
          amount,
          method: manualMethod,
          transactionReference: transactionReference.trim() || undefined,
          receiptUrl: receiptUrl || undefined,
          status: "PENDING",
          idempotencyKey: crypto.randomUUID(),
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message ?? "Failed to submit payment");
      }

      router.push(`/booking/confirmation/${booking._id}`);
    } catch (submissionError) {
      const message = submissionError instanceof Error ? submissionError.message : "Failed to submit payment";
      setError(message);
    } finally {
      setSubmittingPayment(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-bold text-slate-900">Step 5: Payment</h2>
      <p className="mt-2 text-sm text-slate-600">Complete payment manually and submit receipt/reference for admin verification.</p>

      {error ? <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <div className="mt-5">
        {loadingExistingBooking ? <p className="mb-3 text-sm text-slate-600">Loading your booking for payment...</p> : null}
        {!booking?._id ? (
          <div className="flex flex-wrap gap-3">
            <button
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              onClick={startPayment}
              disabled={processing || loadingExistingBooking}
            >
              {processing ? "Preparing booking..." : "Create booking and continue to manual payment"}
            </button>
          </div>
        ) : (
          <div className="grid gap-5">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <p><strong>Booking ID:</strong> {booking._id}</p>
              <p><strong>Booking Ref:</strong> {booking.bookingRef}</p>
              <p>
                <strong>Amount Due:</strong> {Number(booking.pricing?.total ?? booking.totalPrice ?? 0).toFixed(2)} {booking.pricing?.currency ?? "USD"}
              </p>
              <p className="mt-1 text-xs text-slate-500">Use your Booking ID or Booking Ref as payment note.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <article className="rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="text-lg font-semibold text-slate-900">Bank Transfer</h3>
                <p className="mt-2 text-sm text-slate-700"><strong>Bank:</strong> {BANK_DETAILS.bankName}</p>
                <p className="text-sm text-slate-700"><strong>Account Name:</strong> {BANK_DETAILS.accountName}</p>
                <p className="text-sm text-slate-700"><strong>Account Number:</strong> {BANK_DETAILS.accountNumber}</p>
                <p className="mt-2 text-xs text-slate-500">Reference note: Booking Ref {booking.bookingRef}</p>
              </article>

              <article className="rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="text-lg font-semibold text-slate-900">Mobile Money</h3>
                <p className="mt-2 text-sm text-slate-700"><strong>Provider:</strong> {MOBILE_MONEY_DETAILS.provider}</p>
                <p className="text-sm text-slate-700"><strong>Account Name:</strong> {MOBILE_MONEY_DETAILS.accountName}</p>
                <p className="text-sm text-slate-700"><strong>Phone:</strong> {MOBILE_MONEY_DETAILS.phone}</p>
                <p className="mt-2 text-xs text-slate-500">Instructions: Send exact amount and keep transaction reference.</p>
              </article>
            </div>

            <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="text-lg font-semibold text-slate-900">Submit Payment Proof</h3>
              <p className="text-sm text-slate-600">Upload receipt (image/PDF) or enter transaction reference. Booking will be confirmed after admin approval.</p>

              <label className="grid gap-1 text-sm font-semibold text-slate-700">
                Payment Method
                <select
                  className="rounded-lg border border-slate-300 px-3 py-2"
                  value={manualMethod}
                  onChange={(e) => setManualMethod(e.target.value as ManualMethod)}
                >
                  <option value="bank">Bank Transfer</option>
                  <option value="mobile_money">Mobile Money (Telebirr / M-Pesa)</option>
                </select>
              </label>

              <label className="grid gap-1 text-sm font-semibold text-slate-700">
                Transaction Reference (optional if receipt uploaded)
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2"
                  placeholder="TRX-123456"
                  value={transactionReference}
                  onChange={(e) => setTransactionReference(e.target.value)}
                />
              </label>

              <label className="grid gap-1 text-sm font-semibold text-slate-700">
                Receipt File (image/pdf, optional if transaction reference provided)
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2"
                  type="file"
                  accept="image/jpeg,image/png,application/pdf"
                  onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
                />
              </label>

              <div className="flex flex-wrap gap-3">
                <button
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  onClick={submitManualPayment}
                  type="button"
                  disabled={submittingPayment}
                >
                  {submittingPayment ? "Submitting..." : "Submit Payment Proof"}
                </button>

                <button
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800"
                  onClick={() => router.push(`/booking/confirmation/${booking._id}`)}
                  type="button"
                >
                  I will submit proof later
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
