"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ArrowRight, BadgeCheck, CheckCircle2, Landmark, Loader2, Lock, ShieldCheck, Smartphone, Wallet } from "lucide-react";

type CreatedBooking = {
  _id: string;
  bookingRef: string;
  totalPrice: number;
  paymentStatus?: string;
  pricing?: {
    total?: number;
    currency?: string;
  };
  guestSnapshot?: {
    fullName: string;
    email: string;
  };
};

const PAYMENT_METHODS = [
  { name: "Telebirr", desc: "Mobile money", icon: Smartphone },
  { name: "CBEBirr", desc: "Mobile money", icon: Smartphone },
  { name: "Bank Transfer", desc: "CBE, Dashen, Awash", icon: Landmark },
  { name: "Card", desc: "Debit & credit", icon: Wallet },
];

export function BookingPaymentStep() {
  const params = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();
  const bookingIdFromQuery = params.get("bookingId")?.trim() ?? "";

  useEffect(() => {
    const token = localStorage.getItem("hotel_saas_token")?.trim() ?? "";
    if (!token && !session && bookingIdFromQuery) {
      router.replace(`/booking/customer-auth?bookingId=${encodeURIComponent(bookingIdFromQuery)}&returnTo=payment`);
    }
  }, [session]);

  const [booking, setBooking] = useState<CreatedBooking | null>(null);
  const [processing, setProcessing] = useState(false);
  const [loadingExistingBooking, setLoadingExistingBooking] = useState(false);
  const [error, setError] = useState("");
  const [chapaLoading, setChapaLoading] = useState(false);
  const [chapaError, setChapaError] = useState<string | null>(null);
  const creatingRef = useRef(false);

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
    router.replace(`/booking/customer-auth?bookingId=${encodeURIComponent(bookingIdFromQuery)}&returnTo=payment`);
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
      if (!token && !session) {
        if (active) {
          setLoadingExistingBooking(false);
          redirectToCustomerSignIn();
        }
        return;
      }

      const response = await fetch(`/api/bookings/${encodeURIComponent(bookingIdFromQuery)}`, {
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
        if (response.status === 404) {
          setError("Booking not found.");
          return;
        }
        setError(responsePayload.message ?? "Failed to load booking for payment.");
        return;
      }

      const found = responsePayload.booking ?? responsePayload;
      if (!found?._id) {
        setLoadingExistingBooking(false);
        setError("Booking not found in your account.");
        return;
      }

      setBooking({
        _id: found._id,
        bookingRef: found.bookingRef,
        totalPrice: found.totalPrice,
        paymentStatus: found.paymentStatus,
        pricing: found.pricing,
        guestSnapshot: found.guestSnapshot,
      });
      setLoadingExistingBooking(false);
    }

    loadExistingBooking();

    return () => {
      active = false;
    };
  }, [booking, bookingIdFromQuery, session]);

  async function startPayment() {
    if (creatingRef.current) return;
    creatingRef.current = true;
    setProcessing(true);
    setError("");

    if (bookingIdFromQuery) {
      router.push(`/booking/payment?bookingId=${encodeURIComponent(bookingIdFromQuery)}`);
      return;
    }

    const bookingRes = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, idempotencyKey: crypto.randomUUID() }),
    });

    const bookingData = await bookingRes.json();
    if (!bookingRes.ok) {
      creatingRef.current = false;
      setProcessing(false);
      setError(bookingData.message ?? "Failed to create booking");
      return;
    }

    router.push(`/booking/payment?bookingId=${encodeURIComponent(bookingData.booking._id)}`);
  }

  async function handleChapaPayment() {
    if (!booking?._id) {
      return;
    }

    setChapaLoading(true);
    setChapaError(null);

    try {
      const token = localStorage.getItem("hotel_saas_token")?.trim() ?? "";
      const response = await fetch("/api/payment/chapa/initialize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ bookingId: booking._id }),
      });

      const data = (await response.json().catch(() => ({}))) as { checkout_url?: string; message?: string };
      if (!response.ok || !data.checkout_url) {
        throw new Error(data.message ?? "Failed to initialize payment");
      }

      window.location.href = data.checkout_url;
    } catch (err) {
      setChapaError(err instanceof Error ? err.message : "Failed to initialize payment");
    } finally {
      setChapaLoading(false);
    }
  }

  const amountDue = Number(booking?.pricing?.total ?? booking?.totalPrice ?? 0);
  const currency = booking?.pricing?.currency ?? "ETB";
  const isPaid = booking?.paymentStatus === "PAID";

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:bg-[#1e2a3a] dark:border-white/5">
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Step 5: Payment</h2>
      <p className="mt-2 text-sm text-slate-600 dark:text-[#94a3b8]">Pay online securely and your booking is confirmed instantly.</p>

      {error ? <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">{error}</p> : null}

      <div className="mt-5">
        {loadingExistingBooking ? <p className="mb-3 text-sm text-slate-600 dark:text-[#94a3b8]">Loading your booking for payment...</p> : null}
        {!booking?._id ? (
          <div className="flex flex-wrap gap-3">
            <button
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 dark:bg-[#2a3a52]"
              onClick={startPayment}
              disabled={processing || loadingExistingBooking}
            >
              {processing ? "Preparing booking..." : "Create booking and continue to payment"}
            </button>
          </div>
        ) : (
          <div className="grid gap-6">
            <div className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:bg-[#243044] dark:border-white/5 dark:text-[#94a3b8] sm:grid-cols-2">
              <div>
                <p><strong>Booking Ref:</strong> {booking.bookingRef}</p>
                <p>
                  <strong>Amount Due:</strong> {currency} {amountDue.toFixed(2)}
                </p>
              </div>
              <div className="sm:border-l sm:border-[#e0d5c8] dark:sm:border-[#3a2a1a] sm:pl-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-[#9a8a7a] dark:text-[#5a4a3a] mb-1">Guest</p>
                <p className="text-sm font-semibold text-[#1a1a1a] dark:text-white">{booking.guestSnapshot?.fullName}</p>
                <p className="text-sm text-[#6a5a4a] dark:text-[#9a8a7a] break-all">{booking.guestSnapshot?.email}</p>
              </div>
            </div>

            {isPaid ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center dark:bg-emerald-900/20 dark:border-emerald-800/40">
                <CheckCircle2 size={44} className="mx-auto text-emerald-500 dark:text-emerald-400" />
                <h3 className="mt-3 text-xl font-bold text-emerald-700 dark:text-emerald-300">Payment Completed</h3>
                <p className="mt-1 text-sm text-emerald-900/80 dark:text-emerald-300/80">
                  Your booking is confirmed. Thank you!
                </p>
                <Link
                  href={`/booking/confirmation/${booking._id}`}
                  className="mt-5 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  View Confirmation <ArrowRight size={16} />
                </Link>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/5 dark:bg-[#1e2a3a]">
                <div className="flex items-center gap-3 bg-gradient-to-r from-[#2a9d5c] to-[#1f7a46] px-6 py-5 text-white">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                    <Wallet size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-widest">Online Payment</h3>
                    <p className="text-xs text-white/80">Pay securely with Chapa — confirmed instantly</p>
                  </div>
                </div>

                <div className="p-6">
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4 dark:bg-[#243044]">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">Amount Due</p>
                      <p className="mt-1 text-3xl font-black text-slate-900 dark:text-white">
                        {currency} {amountDue.toFixed(2)}
                      </p>
                    </div>
                    <BadgeCheck size={32} className="text-[#2a9d5c]" />
                  </div>

                  <button
                    onClick={handleChapaPayment}
                    disabled={chapaLoading}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2a9d5c] to-[#1f7a46] py-4 text-sm font-bold text-white shadow-lg shadow-[#2a9d5c]/25 transition-all duration-200 hover:shadow-xl hover:brightness-105 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {chapaLoading ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Redirecting to Chapa...
                      </>
                    ) : (
                      <>
                        Pay with Chapa
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>

                  {chapaError ? (
                    <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">{chapaError}</p>
                  ) : null}

                  <div className="mt-6">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">Pay with</p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {PAYMENT_METHODS.map((method) => (
                        <div
                          key={method.name}
                          className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-200 px-2 py-3 text-center dark:border-white/5"
                        >
                          <method.icon size={20} className="text-[#2a9d5c]" />
                          <span className="text-xs font-semibold text-slate-700 dark:text-gray-200">{method.name}</span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500">{method.desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1"><Lock size={13} /> SSL Secure</span>
                    <span className="inline-flex items-center gap-1"><ShieldCheck size={13} /> Instant Confirmation</span>
                    <span className="inline-flex items-center gap-1"><BadgeCheck size={13} /> Powered by Chapa</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
