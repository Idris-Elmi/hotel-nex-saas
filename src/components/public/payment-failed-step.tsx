"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, RotateCcw, XCircle } from "lucide-react";

export function PaymentFailedStep() {
  const params = useSearchParams();
  const bookingId = params.get("bookingId")?.trim() ?? "";

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:bg-[#1e2a3a] dark:border-white/5">
      <div className="py-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
          <XCircle size={28} className="text-red-600 dark:text-red-400" />
        </div>
        <h2 className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">Payment Failed</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-[#94a3b8]">
          Your payment was not completed and no money was charged. You can try again.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {bookingId ? (
            <Link
              href={`/booking/payment?bookingId=${encodeURIComponent(bookingId)}`}
              className="inline-flex items-center gap-2 rounded-lg bg-[#2a9d5c] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#238a4f]"
            >
              <RotateCcw size={16} /> Try Again
            </Link>
          ) : null}
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-800 dark:border-white/10 dark:text-gray-300"
          >
            <ArrowLeft size={16} /> Back to Home
          </Link>
        </div>

        <p className="mt-5 text-xs text-slate-400 dark:text-slate-500">
          If money was deducted but you were redirected here, contact support before paying again.
        </p>
      </div>
    </section>
  );
}
