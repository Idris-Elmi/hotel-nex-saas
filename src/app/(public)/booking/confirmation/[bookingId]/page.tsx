import type { Metadata } from "next";
import { BookingStepper } from "@/components/public/booking-stepper";
import { BookingInvoice } from "@/components/public/booking-invoice";
import { ConfirmationActions } from "@/components/public/confirmation-actions";
import BookingHeader from "@/components/BookingHeader";
import { connectDb } from "@/lib/db/mongoose";
import { getBookingById } from "@/modules/bookings/services/booking.service";

type Props = {
  params: Promise<{ bookingId: string }>;
};

type BookingPayload = {
  _id: string;
  bookingRef: string;
  status: string;
  paymentStatus: string;
  arrivalDate: string;
  departureDate: string;
  nights?: number;
  totalPrice?: number;
  amountPaid?: number;
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
  latestPayment?: {
    status: string;
    method: string;
    transactionReference?: string;
    createdAt?: string;
  };
};

function toStr(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "object" && "toString" in v) return String(v);
  return "";
}

async function getBooking(bookingId: string): Promise<BookingPayload | null> {
  try {
    await connectDb();
    const booking = await getBookingById(bookingId);
    const latestPayment = (booking as any).payments?.[0] ?? null;
    return {
      _id: toStr((booking as any)._id),
      bookingRef: (booking as any).bookingRef ?? "",
      status: (booking as any).status ?? "",
      paymentStatus: (booking as any).paymentStatus ?? "",
      arrivalDate: toStr((booking as any).arrivalDate),
      departureDate: toStr((booking as any).departureDate),
      nights: (booking as any).nights,
      totalPrice: (booking as any).totalPrice,
      amountPaid: (booking as any).amountPaid,
      guestSnapshot: (booking as any).guestSnapshot,
      pricing: (booking as any).pricing,
      latestPayment: latestPayment
        ? {
            status: latestPayment.status ?? "",
            method: latestPayment.method ?? "",
            transactionReference: latestPayment.transactionReference,
            createdAt: toStr(latestPayment.createdAt),
          }
        : undefined,
    };
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { bookingId } = await params;
  return {
    title: `Confirmation ${bookingId.slice(0, 8)}`,
    description: "Your booking confirmation and payment summary.",
  };
}

export default async function BookingConfirmationPage({ params }: Props) {
  const { bookingId } = await params;
  const booking = await getBooking(bookingId);

  if (!booking) {
    return (
      <div className="min-h-screen bg-[#f0f2f5] dark:bg-[#0f1623] transition-colors duration-200">
        <BookingHeader currentStep={6} />
        <div className="pt-16">
          <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">Booking not found.</main>
        </div>
      </div>
    );
  }

  const latestPayment = booking.latestPayment ?? null;
  const verificationState = latestPayment?.status ?? "PENDING";

  return (
    <div className="min-h-screen bg-[#f0f2f5] dark:bg-[#0f1623] transition-colors duration-200">
      <BookingHeader currentStep={6} />
      <div className="pt-16">
        <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
          <BookingStepper current={6} />

          <section className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm dark:bg-[#1e2a3a] dark:border-emerald-800/40">
            <h1 className="text-3xl font-black text-emerald-700 dark:text-emerald-300">Step 6: Confirmation</h1>
            <p className="mt-2 text-emerald-900 dark:text-emerald-300/80">
              Your reservation has been recorded successfully.
            </p>

            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-300">
              <p><strong className="dark:text-amber-400">Payment Verification:</strong> {verificationState}</p>
              {verificationState === "PENDING" ? <p className="mt-1">Your payment is pending manual verification by admin.</p> : null}
              {verificationState === "REJECTED" ? <p className="mt-1">Your payment was rejected. Please submit a new payment proof.</p> : null}
              {(verificationState === "APPROVED" || verificationState === "PAID" || verificationState === "PARTIAL") ? <p className="mt-1">Your payment has been verified.</p> : null}
            </div>

            <div className="mt-6 grid gap-2 rounded-xl bg-white p-4 text-sm text-slate-700 dark:bg-[#243044] dark:text-white">
              <p><strong className="dark:text-[#64748b]">Guest:</strong> {booking.guestSnapshot?.fullName ?? "-"}</p>
              <p><strong className="dark:text-[#64748b]">Booking Ref:</strong> {booking.bookingRef}</p>
              <p><strong className="dark:text-[#64748b]">Status:</strong> {booking.status}</p>
              <p><strong className="dark:text-[#64748b]">Payment Status:</strong> {booking.paymentStatus}</p>
              <p><strong className="dark:text-[#64748b]">Total:</strong> <span className="dark:font-bold">ETB {Number(booking.pricing?.total ?? booking.totalPrice ?? 0).toFixed(2)}</span></p>
              <p><strong className="dark:text-[#64748b]">Arrival:</strong> {new Date(booking.arrivalDate).toLocaleDateString()}</p>
              <p><strong className="dark:text-[#64748b]">Departure:</strong> {new Date(booking.departureDate).toLocaleDateString()}</p>
              {latestPayment?.transactionReference ? <p><strong className="dark:text-[#64748b]">Transaction Ref:</strong> {latestPayment.transactionReference}</p> : null}
            </div>

            <ConfirmationActions bookingId={bookingId} />
          </section>

          <section className="mt-6">
            <h2 className="mb-3 text-lg font-bold text-slate-900 dark:text-white">Invoice / Receipt</h2>
            <BookingInvoice
              data={{
                _id: booking._id,
                bookingRef: booking.bookingRef,
                status: booking.status,
                paymentStatus: booking.paymentStatus,
                arrivalDate: booking.arrivalDate,
                departureDate: booking.departureDate,
                nights: booking.nights,
                totalPrice: booking.totalPrice,
                amountPaid: booking.amountPaid,
                guestSnapshot: booking.guestSnapshot,
                pricing: booking.pricing,
                latestPayment: latestPayment
                  ? {
                      status: latestPayment.status,
                      method: latestPayment.method,
                      transactionReference: latestPayment.transactionReference,
                      createdAt: latestPayment.createdAt,
                    }
                  : undefined,
              }}
            />
          </section>
        </main>
      </div>
    </div>
  );
}
