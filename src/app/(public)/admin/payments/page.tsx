"use client";

import { useState } from "react";
import { RoleGate } from "@/components/auth/RoleGate";

type PaymentStatusFilter = "PENDING" | "APPROVED" | "REJECTED" | "ALL";

type AdminPayment = {
  _id: string;
  amount: number;
  method: "bank" | "mobile_money" | "cash" | "transfer" | "upload";
  status: "PENDING" | "APPROVED" | "REJECTED" | "PAID" | "PARTIAL" | "REFUNDED";
  transactionReference?: string;
  receiptUrl?: string;
  createdAt: string;
  booking: {
    id: string;
    bookingRef: string;
    totalPrice: number;
    status: string;
    arrivalDate: string;
    departureDate: string;
    room: {
      id: string;
      roomNumber: string;
    };
    guest: {
      fullName: string;
      email: string;
      phone?: string;
    };
  } | null;
};

export default function AdminPaymentsPage({ apiBase }: { apiBase?: string } = {}) {
  return (
    <RoleGate allow={["OWNER", "ADMIN"]} loginRoute="/auth/staff-signin">
      <AdminPaymentsContent apiBase={apiBase} />
    </RoleGate>
  );
}

function AdminPaymentsContent({ apiBase = "/api/admin" }: { apiBase?: string }) {
  function getToken() {
    if (typeof window === "undefined") {
      return "";
    }
    return (sessionStorage.getItem("hotel_saas_token_staff") || "") ?? "";
  }

  function requireAuthHeader() {
    const token = getToken().trim();
    if (!token) {
      setError("Missing JWT token. Login as ADMIN first.");
      return null;
    }

    return { Authorization: `Bearer ${token}` };
  }

  const [statusFilter, setStatusFilter] = useState<PaymentStatusFilter>("PENDING");
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadPayments() {
    const authHeader = requireAuthHeader();
    if (!authHeader) {
      return;
    }

    setLoading(true);
    setError("");

    const params = new URLSearchParams();
    if (statusFilter !== "ALL") {
      params.set("status", statusFilter);
    }

    const response = await fetch(`${apiBase}/payments?${params.toString()}`, {
      headers: authHeader,
      cache: "no-store",
    });

    const payload = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      if (response.status === 401) {
        setError("Your admin session expired. Please login again.");
        return;
      }

      setError(payload.message ?? "Failed to load payments");
      return;
    }

    setPayments((payload.payments ?? []) as AdminPayment[]);
  }

  async function reviewPayment(paymentId: string, action: "approve" | "reject") {
    const authHeader = requireAuthHeader();
    if (!authHeader) {
      return;
    }

    const response = await fetch(`${apiBase}/payments/${paymentId}/review`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeader,
      },
      body: JSON.stringify({ action }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401) {
        setError("Your admin session expired. Please login again.");
        return;
      }

      setError(payload.message ?? "Failed to review payment");
      return;
    }

    await loadPayments();
  }

  return (
    <main className="p-6 lg:p-8 space-y-8 bg-[#F0F4FF] dark:bg-[#070B1A] min-h-screen max-w-7xl mx-auto">
      <h1 className="text-2xl font-serif font-bold text-slate-900 dark:text-slate-100 mb-6">Manual Payments Admin</h1>


      <section className="bg-white dark:bg-[#0F1629] border border-slate-200 dark:border-[#1E2D4A] rounded-2xl p-5 shadow-sm flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-300">
          Status Filter
          <select
            className="rounded-xl border border-[#E0E7FF] dark:border-[#1E2D4A] bg-[#F1F5FF] dark:bg-[#1A2540] px-3 py-2 text-sm text-[#0D1340] dark:text-[#EEF2FF]"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as PaymentStatusFilter)}
          >
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="ALL">All</option>
          </select>
        </label>

        <button
          className="rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 transition-all duration-200"
          onClick={loadPayments}
          disabled={loading}
        >
          {loading ? "Loading..." : "Load Payments"}
        </button>
      </section>

      {error ? <p className="rounded-xl bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-red-700 dark:text-red-400">{error}</p> : null}

      <section className="grid gap-3">
        {payments.map((payment) => (
          <article key={payment._id} className="bg-white dark:bg-[#0F1629] border border-slate-200 dark:border-[#1E2D4A] rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200">
            <p className="font-semibold text-slate-900 dark:text-slate-100">
              Payment ID: {payment._id} | Status: {payment.status} | Method: {payment.method} | Amount: ETB {payment.amount.toFixed(2)}
            </p>
            <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
              Booking ID: {payment.booking?.id ?? "N/A"} | Booking Ref: {payment.booking?.bookingRef ?? "N/A"} | Room ID: {payment.booking?.room.id ?? "N/A"} | Room Number: {payment.booking?.room.roomNumber ?? "N/A"}
            </p>
            <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
              Guest: {payment.booking?.guest.fullName ?? "Unknown"} ({payment.booking?.guest.email ?? "N/A"}) | Phone: {payment.booking?.guest.phone ?? "N/A"}
            </p>
            <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
              Stay: {payment.booking ? new Date(payment.booking.arrivalDate).toLocaleDateString() : "-"} to {payment.booking ? new Date(payment.booking.departureDate).toLocaleDateString() : "-"}
            </p>
            {payment.transactionReference ? <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">Transaction Ref: {payment.transactionReference}</p> : null}
            {payment.receiptUrl ? (
              <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                Receipt: <a className="text-indigo-600 dark:text-indigo-400 underline hover:text-indigo-800" href={payment.receiptUrl} target="_blank" rel="noreferrer">View receipt</a>
              </p>
            ) : null}

            {payment.status === "PENDING" ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  className="rounded-xl bg-emerald-500 hover:bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-all duration-200"
                  onClick={() => reviewPayment(payment._id, "approve")}
                >
                  Approve Payment
                </button>
                <button
                  className="rounded-xl bg-rose-500 hover:bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition-all duration-200"
                  onClick={() => reviewPayment(payment._id, "reject")}
                >
                  Reject Payment
                </button>
              </div>
            ) : null}
          </article>
        ))}

        {!loading && payments.length === 0 ? <p className="text-sm text-slate-500 dark:text-slate-400">No payments found.</p> : null}
      </section>
    </main>
  );
}
