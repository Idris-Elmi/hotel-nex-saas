import type { Metadata } from "next";
import { Suspense } from "react";
import { BookingStepper } from "@/components/public/booking-stepper";
import { PaymentSuccessStep } from "@/components/public/payment-success-step";
import BookingHeader from "@/components/BookingHeader";

export const metadata: Metadata = {
  title: "Payment Success",
  description: "Verify your Chapa payment and confirm your booking.",
};

export default function PaymentSuccessPage() {
  return (
    <div className="min-h-screen bg-[#f0f2f5] dark:bg-[#0f1623] transition-colors duration-200">
      <BookingHeader currentStep={5} />
      <div className="pt-16">
        <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
          <BookingStepper current={6} />
          <div className="mt-6">
            <Suspense fallback={<p>Verifying payment...</p>}>
              <PaymentSuccessStep />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}
