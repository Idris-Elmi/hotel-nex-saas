import type { Metadata } from "next";
import { Suspense } from "react";
import { BookingStepper } from "@/components/public/booking-stepper";
import { BookingPaymentStep } from "@/components/public/booking-payment-step";

export const metadata: Metadata = {
  title: "Payment",
  description: "Submit manual payment proof for booking verification.",
};

export default function BookingPaymentPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <BookingStepper current={5} />
      <div className="mt-6">
        <Suspense fallback={<p>Loading payment...</p>}>
          <BookingPaymentStep />
        </Suspense>
      </div>
    </main>
  );
}
