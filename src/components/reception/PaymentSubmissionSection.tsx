"use client";

import { useState, useEffect } from "react";
import { Upload } from "lucide-react";

function getAuthHeaders() {
  const token = sessionStorage.getItem("hotel_saas_token_staff")?.trim() ?? "";
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

export default function PaymentSubmissionSection({ externalBookingId }: { externalBookingId?: string }) {
  const [bookingId, setBookingId] = useState("");

  useEffect(() => {
    if (externalBookingId) setBookingId(externalBookingId);
  }, [externalBookingId]);
  const [paymentMethod, setPaymentMethod] = useState<"transfer" | "cash">("transfer");
  const [paymentTransaction, setPaymentTransaction] = useState("");
  const [paymentReceiptFile, setPaymentReceiptFile] = useState<File | null>(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState("");

  async function uploadReceiptIfNeeded() {
    if (!paymentReceiptFile) return "";
    const form = new FormData();
    form.append("file", paymentReceiptFile);
    const uploadRes = await fetch("/api/uploads/payment-receipt", {
      method: "POST",
      body: form,
    });
    const uploadPayload = await uploadRes.json().catch(() => ({}));
    if (!uploadRes.ok) {
      throw new Error(uploadPayload.message ?? "Failed to upload receipt file");
    }
    return String(uploadPayload.url ?? "");
  }

  async function submitReceptionPayment(e: React.FormEvent) {
    e.preventDefault();
    setPaymentMessage("");
    if (!bookingId.trim()) {
      setPaymentMessage("Booking ID is required.");
      return;
    }
    if (paymentAmount <= 0) {
      setPaymentMessage("Payment amount must be greater than zero.");
      return;
    }
    const hasTransaction = paymentTransaction.trim().length > 0;
    const hasFile = Boolean(paymentReceiptFile);
    const isCash = paymentMethod === "cash";
    if (!isCash && !hasTransaction && !hasFile) {
      setPaymentMessage("Provide transaction number or receipt file, or select Cash Payment.");
      return;
    }
    setPaymentSubmitting(true);
    try {
      const receiptUrl = await uploadReceiptIfNeeded();
      const response = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: bookingId.trim(),
          amount: paymentAmount,
          method: paymentMethod,
          transactionReference: hasTransaction ? paymentTransaction.trim() : undefined,
          receiptUrl: receiptUrl || undefined,
          status: "PENDING",
          idempotencyKey: crypto.randomUUID(),
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setPaymentMessage(payload.message ?? "Failed to submit payment");
        return;
      }
      setPaymentMessage("Payment submitted with Pending status. Admin will approve or reject.");
      setPaymentTransaction("");
      setPaymentReceiptFile(null);
      setPaymentMethod("transfer");
    } catch (submissionError) {
      const text = submissionError instanceof Error ? submissionError.message : "Failed to submit payment";
      setPaymentMessage(text);
    } finally {
      setPaymentSubmitting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-6 shadow-sm transition-all duration-200 space-y-5">
      <div>
        <h2 className="text-xl font-serif font-semibold text-slate-900 dark:text-slate-100">Payment Submission</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Reception can submit payment as pending. Only Admin can approve or reject.</p>
      </div>

      {paymentMessage ? <p className="rounded-xl bg-slate-100 dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-800 dark:text-slate-200">{paymentMessage}</p> : null}

      <form onSubmit={submitReceptionPayment} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Booking ID</span>
            <input
              className="w-full px-4 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-all duration-200"
              value={bookingId}
              onChange={(e) => setBookingId(e.target.value)}
              placeholder="Paste booking ID"
              required
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Payment Amount</span>
            <input
              className="w-full px-4 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-all duration-200"
              type="number"
              min={0.01}
              step="0.01"
              value={paymentAmount || ""}
              onChange={(e) => setPaymentAmount(Number(e.target.value) || 0)}
              required
            />
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Payment Method</span>
            <select
              className="w-full px-4 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-all duration-200"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as "transfer" | "cash")}
            >
              <option value="transfer">Transfer</option>
              <option value="cash">Cash Payment</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Transaction Number (optional for cash)</span>
            <input
              className="w-full px-4 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-all duration-200"
              value={paymentTransaction}
              onChange={(e) => setPaymentTransaction(e.target.value)}
              placeholder="TRX-123456"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Receipt File (image/pdf, optional for cash)</span>
          <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl p-6 text-center hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-all duration-200 cursor-pointer">
            <div className="flex flex-col items-center gap-2 mb-3">
              <Upload size={24} className="text-slate-400 dark:text-slate-500" />
              <p className="text-xs text-slate-400 dark:text-slate-500">Click to upload receipt</p>
            </div>
            <input
              className="w-full text-sm text-slate-500 dark:text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:text-xs file:font-semibold file:bg-indigo-50 dark:file:bg-indigo-900/20 file:text-indigo-600 dark:file:text-indigo-400 file:border-0 hover:file:bg-indigo-100 dark:hover:file:bg-indigo-900/30 file:transition-all file:duration-200"
              type="file"
              accept="image/jpeg,image/png,application/pdf"
              onChange={(e) => setPaymentReceiptFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </label>

        <div className="rounded-xl bg-slate-50 dark:bg-slate-800/30 px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
          Rule: For Transfer, provide transaction number, receipt file, or both together. For Cash Payment, transaction/receipt are not required. Submitted status is always Pending.
        </div>

        <button
          className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-slate-900 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-600 active:scale-[0.99] transition-all duration-200 shadow-sm disabled:opacity-60"
          type="submit"
          disabled={paymentSubmitting}
        >
          {paymentSubmitting ? "Submitting Payment..." : "Submit Payment (Pending)"}
        </button>
      </form>
    </section>
  );
}
