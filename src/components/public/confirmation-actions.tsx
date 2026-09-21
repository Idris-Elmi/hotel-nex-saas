"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ConfirmationActions({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  function clearContinuePaymentSession() {
    sessionStorage.removeItem("booking_progress_continue_payment");
    sessionStorage.removeItem("booking_progress_booking_id");
  }

  async function signOutAndSignInAgain() {
    setBusy(true);

    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      clearContinuePaymentSession();
      setBusy(false);
      router.push(`/auth/customer-signin?redirectTo=${encodeURIComponent(`/customer/dashboard?bookingId=${bookingId}`)}`);
    }
  }

  return (
    <div className="mt-5 flex flex-wrap gap-3">
      <a
        href={`/customer/dashboard?bookingId=${encodeURIComponent(bookingId)}`}
        onClick={clearContinuePaymentSession}
        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100 dark:border-[#2a3a52] dark:bg-[#243044] dark:text-white dark:hover:bg-[#2a3a52]"
      >
        Go to My Bookings
      </a>
      <button
        type="button"
        onClick={signOutAndSignInAgain}
        disabled={busy}
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 dark:bg-[#243044] dark:hover:bg-[#2a3a52]"
      >
        {busy ? "Signing out..." : "Sign out and sign in again"}
      </button>
    </div>
  );
}
