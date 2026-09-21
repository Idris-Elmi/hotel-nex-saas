"use client";

import { useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import { BadgeCheck, Download, Loader2, Printer } from "lucide-react";

export type BookingInvoiceData = {
  _id: string;
  bookingRef: string;
  status: string;
  paymentStatus: string;
  arrivalDate: string;
  departureDate: string;
  nights?: number;
  guestSnapshot?: {
    fullName: string;
    email: string;
    phone?: string;
  };
  pricing?: {
    perNight?: number;
    addons?: number;
    subtotal?: number;
    taxes?: number;
    total?: number;
    currency?: string;
  };
  totalPrice?: number;
  amountPaid?: number;
  latestPayment?: {
    status: string;
    method: string;
    transactionReference?: string;
    createdAt?: string;
  };
};

const METHOD_LABELS: Record<string, string> = {
  transfer: "Online payment (Chapa)",
  bank: "Bank Transfer",
  mobile_money: "Mobile Money",
  cash: "Cash",
  upload: "Receipt Upload",
};

function money(value: number | undefined, currency: string): string {
  const amount = Number(value ?? 0);
  return `${currency} ${amount.toFixed(2)}`;
}

function formatDate(value: string | undefined): string {
  if (!value) {
    return "-";
  }
  return new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function BookingInvoice({ data }: { data: BookingInvoiceData }) {
  const [generating, setGenerating] = useState(false);

  const currency = data.pricing?.currency ?? "ETB";
  const perNight = Number(data.pricing?.perNight ?? 0);
  const addons = Number(data.pricing?.addons ?? 0);
  const subtotal = Number(data.pricing?.subtotal ?? perNight * (data.nights ?? 0));
  const taxes = Number(data.pricing?.taxes ?? 0);
  const total = Number(data.pricing?.total ?? data.totalPrice ?? subtotal + taxes);
  const amountPaid = Number(data.amountPaid ?? 0);

  const paymentLabel = data.latestPayment?.method ? METHOD_LABELS[data.latestPayment.method] ?? data.latestPayment.method : "Online payment (Chapa)";

  const rows = useMemo(() => {
    const nights = data.nights ?? 1;
    return [
      { label: `Room stay (${nights} night${nights > 1 ? "s" : ""})`, amount: perNight * nights },
      { label: "Add-ons", amount: addons },
    ];
  }, [data.nights, perNight, addons]);

  function downloadPdf() {
    setGenerating(true);
    try {
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 40;
      const right = pageWidth - margin;

      doc.setFillColor(26, 35, 50);
      doc.rect(0, 0, pageWidth, 110, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text("AURORA STAYS", margin, 52);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(190, 215, 205);
      doc.text("Addis Ababa, Ethiopia", margin, 70);
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text("INVOICE / RECEIPT", right, 52, { align: "right" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`No: ${data.bookingRef}`, right, 70, { align: "right" });
      doc.text(`Issued: ${formatDate(new Date().toISOString())}`, right, 84, { align: "right" });

      let y = 150;
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 41, 59);
      doc.text("BILL TO", margin, y);
      y += 18;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.text(data.guestSnapshot?.fullName ?? "Guest", margin, y);
      y += 15;
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(data.guestSnapshot?.email ?? "", margin, y);
      y += 14;
      doc.text(data.guestSnapshot?.phone ?? "", margin, y);

      const details = [
        `Booking Ref: ${data.bookingRef}`,
        `Status: ${data.status}`,
        `Arrival: ${formatDate(data.arrivalDate)}`,
        `Departure: ${formatDate(data.departureDate)}`,
        `Nights: ${data.nights ?? "-"}`,
      ];
      doc.setTextColor(100, 116, 139);
      for (const line of details) {
        doc.text(line, right, y, { align: "right" });
        y += 14;
      }

      y += 14;
      doc.setFillColor(226, 232, 240);
      doc.rect(margin, y, right - margin, 26, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      doc.text("Description", margin + 8, y + 17);
      doc.text("Amount", right - 8, y + 17, { align: "right" });
      y += 26;

      doc.setFont("helvetica", "normal");
      doc.setTextColor(51, 65, 85);
      for (const row of rows) {
        doc.text(row.label, margin + 8, y + 14);
        doc.text(money(row.amount, currency), right - 8, y + 14, { align: "right" });
        y += 26;
      }

      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y, right, y);
      y += 20;
      doc.text("Subtotal", margin + 8, y);
      doc.text(money(subtotal, currency), right - 8, y, { align: "right" });
      y += 22;
      doc.text("Taxes & fees", margin + 8, y);
      doc.text(money(taxes, currency), right - 8, y, { align: "right" });

      y += 14;
      doc.setFillColor(45, 212, 191);
      doc.roundedRect(margin, y, right - margin, 34, 6, 6, "F");
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("TOTAL", margin + 8, y + 22);
      doc.text(money(total, currency), right - 8, y + 22, { align: "right" });
      y += 56;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      doc.text("PAYMENT", margin, y);
      y += 18;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(51, 65, 85);
      doc.text(`Method: ${paymentLabel}`, margin, y);
      y += 15;
      if (data.latestPayment?.transactionReference) {
        doc.text(`Transaction Ref: ${data.latestPayment.transactionReference}`, margin, y);
        y += 15;
      }
      doc.text(`Paid: ${money(amountPaid, currency)}`, margin, y);
      y += 15;
      const paid = data.paymentStatus === "PAID" || data.paymentStatus === "PARTIAL";
      doc.setTextColor(paid ? 22 : 194, paid ? 163 : 65, paid ? 74 : 12);
      doc.text(`Status: ${data.paymentStatus}`, margin, y);

      y += 40;
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y, right, y);
      y += 24;
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text("Thank you for choosing Aurora Stays. This is a system-generated receipt.", pageWidth / 2, y, { align: "center" });

      doc.save(`Aurora-Stays-Invoice-${data.bookingRef}.pdf`);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/5 dark:bg-[#1e2a3a]">
      <div className="bg-[#1a2332] px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-lg font-black tracking-wide text-white">AURORA STAYS</p>
            <p className="text-xs text-slate-400">Addis Ababa, Ethiopia</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold uppercase tracking-widest text-white">Invoice</p>
            <p className="text-xs text-slate-400">No: {data.bookingRef}</p>
            <p className="text-xs text-slate-400">Issued: {formatDate(new Date().toISOString())}</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">Bill To</p>
            <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{data.guestSnapshot?.fullName ?? "Guest"}</p>
            <p className="text-sm text-slate-500 dark:text-[#94a3b8]">{data.guestSnapshot?.email}</p>
            {data.guestSnapshot?.phone ? <p className="text-sm text-slate-500 dark:text-[#94a3b8]">{data.guestSnapshot.phone}</p> : null}
          </div>
          <div className="sm:text-right">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">Booking Details</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-[#94a3b8]">Arrival: {formatDate(data.arrivalDate)}</p>
            <p className="text-sm text-slate-600 dark:text-[#94a3b8]">Departure: {formatDate(data.departureDate)}</p>
            <p className="text-sm text-slate-600 dark:text-[#94a3b8]">Nights: {data.nights ?? "-"}</p>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 dark:border-white/5">
          <div className="grid grid-cols-2 gap-2 bg-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-slate-500 dark:bg-[#243044] dark:text-slate-400">
            <span>Description</span>
            <span className="text-right">Amount</span>
          </div>
          {rows.map((row) => (
            <div key={row.label} className="grid grid-cols-2 gap-2 border-t border-slate-100 px-4 py-2.5 text-sm text-slate-700 dark:border-white/5 dark:text-[#94a3b8]">
              <span>{row.label}</span>
              <span className="text-right">{money(row.amount, currency)}</span>
            </div>
          ))}
          <div className="grid grid-cols-2 gap-2 border-t border-slate-100 px-4 py-2.5 text-sm text-slate-700 dark:border-white/5 dark:text-[#94a3b8]">
            <span>Subtotal</span>
            <span className="text-right">{money(subtotal, currency)}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 border-t border-slate-100 px-4 py-2.5 text-sm text-slate-700 dark:border-white/5 dark:text-[#94a3b8]">
            <span>Taxes &amp; fees</span>
            <span className="text-right">{money(taxes, currency)}</span>
          </div>
          <div className="flex items-center justify-between bg-[#2dd4bf] px-4 py-3">
            <span className="text-sm font-black text-[#0f172a]">TOTAL</span>
            <span className="text-base font-black text-[#0f172a]">{money(total, currency)}</span>
          </div>
        </div>

        <div className="mt-5 grid gap-1 rounded-xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-[#243044] dark:text-[#94a3b8]">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">Payment</p>
          <p>Method: {paymentLabel}</p>
          {data.latestPayment?.transactionReference ? <p>Transaction Ref: {data.latestPayment.transactionReference}</p> : null}
          <p>Paid: {money(amountPaid, currency)}</p>
          <p className={data.paymentStatus === "PAID" || data.paymentStatus === "PARTIAL" ? "font-semibold text-emerald-600 dark:text-emerald-400" : "font-semibold text-amber-600 dark:text-amber-400"}>
            Status: {data.paymentStatus}
          </p>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <p className="inline-flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
            <BadgeCheck size={14} className="text-[#2a9d5c]" /> System-generated receipt
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={downloadPdf}
              disabled={generating}
              className="inline-flex items-center gap-2 rounded-lg bg-[#2a9d5c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#238a4f] disabled:opacity-60"
            >
              {generating ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
              Download PDF
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 dark:border-white/10 dark:text-gray-300"
            >
              <Printer size={15} /> Print
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
