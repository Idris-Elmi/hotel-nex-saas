import type { Metadata } from "next";
import { Suspense } from "react";
import { BookingStepper } from "@/components/public/booking-stepper";
import { BookingPaymentStep } from "@/components/public/booking-payment-step";
import BookingHeader from "@/components/BookingHeader";

export const metadata: Metadata = {
  title: "Payment",
  description: "Pay online securely via Chapa and confirm your booking instantly.",
};

export default function BookingPaymentPage() {
  return (
    <div className="min-h-screen bg-[#f0f2f5] dark:bg-[#0f1623] transition-colors duration-200">
      <BookingHeader currentStep={5} />
      <div className="pt-16">
        <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
          <BookingStepper current={5} />
      <div className="mt-6">
        <Suspense fallback={<p>Loading payment...</p>}>
          <BookingPaymentStep />
        </Suspense>
      </div>
        </main>
      </div>
    </div>
  );
}
