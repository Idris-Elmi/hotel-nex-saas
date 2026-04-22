import type { Metadata } from "next";
import { BookingStepper } from "@/components/public/booking-stepper";
import { ConfirmationActions } from "@/components/public/confirmation-actions";

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
  pricing: {
    total: number;
    currency: string;
  };
  payments?: Array<{
    _id: string;
    status: string;
    method: string;
    transactionReference?: string;
    receiptUrl?: string;
    createdAt?: string;
  }>;
};

async function getBooking(bookingId: string): Promise<BookingPayload | null> {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const res = await fetch(`${base}/api/bookings/${bookingId}`, { cache: "no-store" });
  if (!res.ok) {
    return null;
  }

  const data = await res.json();
  return data.booking as BookingPayload;
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
    return <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">Booking not found.</main>;
  }

  const latestPayment = booking.payments?.[0] ?? null;
  const verificationState = latestPayment?.status ?? "PENDING";

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <BookingStepper current={6} />

      <section className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
        <h1 className="text-3xl font-black text-emerald-700">Step 6: Confirmation</h1>
        <p className="mt-2 text-emerald-900">Your reservation has been recorded successfully.</p>

        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p><strong>Payment Verification:</strong> {verificationState}</p>
          {verificationState === "PENDING" ? <p className="mt-1">Your payment is pending manual verification by admin.</p> : null}
          {verificationState === "REJECTED" ? <p className="mt-1">Your payment was rejected. Please submit a new payment proof.</p> : null}
          {(verificationState === "APPROVED" || verificationState === "PAID" || verificationState === "PARTIAL") ? <p className="mt-1">Your payment has been verified.</p> : null}
        </div>

        <div className="mt-6 grid gap-2 rounded-xl bg-white p-4 text-sm text-slate-700">
          <p><strong>Booking Ref:</strong> {booking.bookingRef}</p>
          <p><strong>Status:</strong> {booking.status}</p>
          <p><strong>Payment Status:</strong> {booking.paymentStatus}</p>
          <p><strong>Total:</strong> ${booking.pricing.total.toFixed(2)} {booking.pricing.currency}</p>
          <p><strong>Arrival:</strong> {new Date(booking.arrivalDate).toLocaleDateString()}</p>
          <p><strong>Departure:</strong> {new Date(booking.departureDate).toLocaleDateString()}</p>
          {latestPayment?.transactionReference ? <p><strong>Transaction Ref:</strong> {latestPayment.transactionReference}</p> : null}
          {latestPayment?.receiptUrl ? <p><strong>Receipt:</strong> {latestPayment.receiptUrl}</p> : null}
        </div>

        <ConfirmationActions bookingId={bookingId} />
      </section>
    </main>
  );
}
