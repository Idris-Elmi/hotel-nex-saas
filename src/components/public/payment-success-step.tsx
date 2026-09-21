"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

type VerifyState =
  | { phase: "loading" }
  | { phase: "paid"; bookingId: string }
  | { phase: "pending"; bookingId: string }
  | { phase: "error"; message: string };

export function PaymentSuccessStep() {
  const params = useSearchParams();
  const router = useRouter();
  const txRef = params.get("tx_ref")?.trim() ?? "";
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<VerifyState>(() =>
    txRef ? { phase: "loading" } : { phase: "error", message: "Missing transaction reference." },
  );

  useEffect(() => {
    if (!txRef) {
      return;
    }

    let active = true;

    async function runVerify() {
      setState({ phase: "loading" });
      const token = localStorage.getItem("hotel_saas_token")?.trim() ?? "";

      try {
        const response = await fetch(`/api/payment/chapa/verify?tx_ref=${encodeURIComponent(txRef)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          cache: "no-store",
        });
        const data = (await response.json().catch(() => ({}))) as {
          status?: string;
          bookingId?: string;
          message?: string;
        };

        if (!active) {
          return;
        }

        if (!response.ok) {
          setState({ phase: "error", message: data.message ?? "Verification failed. Please try again." });
          return;
        }

        const bookingId = String(data.bookingId ?? "");
        if (data.status === "PAID") {
          setState({ phase: "paid", bookingId });
        } else if (data.status === "REJECTED") {
          router.replace(`/payment/failed${bookingId ? `?bookingId=${encodeURIComponent(bookingId)}` : ""}`);
        } else {
          setState({ phase: "pending", bookingId });
        }
      } catch {
        if (active) {
          setState({ phase: "error", message: "Could not verify payment. Please try again." });
        }
      }
    }

    runVerify();

    return () => {
      active = false;
    };
  }, [txRef, attempt, router]);

  function retry() {
    setAttempt((current) => current + 1);
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:bg-[#1e2a3a] dark:border-white/5">
      {state.phase === "loading" ? (
        <div className="py-10 text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[#2a9d5c] border-t-transparent" />
          <p className="text-sm text-slate-600 dark:text-[#94a3b8]">Verifying your payment with Chapa...</p>
        </div>
      ) : null}

      {state.phase === "paid" ? (
        <div className="py-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600 dark:text-emerald-400">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Payment Successful</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-[#94a3b8]">
            Your payment has been confirmed. Your booking is now confirmed.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {state.bookingId ? (
              <Link
                href={`/booking/confirmation/${state.bookingId}`}
                className="rounded-lg bg-[#2a9d5c] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#238a4f]"
              >
                View Confirmation
              </Link>
            ) : null}
            <Link
              href="/"
              className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-800 dark:border-white/5 dark:text-gray-300"
            >
              Back to Home
            </Link>
          </div>
        </div>
      ) : null}

      {state.phase === "pending" ? (
        <div className="py-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600 dark:text-amber-400">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Payment Pending</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-[#94a3b8]">
            Chapa has not confirmed the payment yet. You can retry verification in a moment.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={retry}
              className="rounded-lg bg-[#2a9d5c] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#238a4f]"
            >
              Check Again
            </button>
            {state.bookingId ? (
              <Link
                href={`/booking/payment?bookingId=${encodeURIComponent(state.bookingId)}`}
                className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-800 dark:border-white/5 dark:text-gray-300"
              >
                Back to Payment
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}

      {state.phase === "error" ? (
        <div className="py-6 text-center">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Something Went Wrong</h2>
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">{state.message}</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={retry}
              className="rounded-lg bg-[#2a9d5c] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#238a4f]"
            >
              Try Again
            </button>
            <Link
              href="/"
              className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-800 dark:border-white/5 dark:text-gray-300"
            >
              Back to Home
            </Link>
          </div>
        </div>
      ) : null}
    </section>
  );
}
