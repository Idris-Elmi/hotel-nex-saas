import { Suspense } from "react";
import { BookingStepper } from "@/components/public/booking-stepper";
import { BookingCustomerAuthStep } from "@/components/public/booking-customer-auth-step";
import BookingHeader from "@/components/BookingHeader";

export default function BookingCustomerAuthPage() {
  return (
    <div className="min-h-screen bg-[#f5ede4] dark:bg-[#1a1008] transition-colors duration-200">
      <BookingHeader currentStep={4} />
      <div className="pt-16">
        <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <BookingStepper current={4} />
      <div className="mt-6">
        <Suspense fallback={<section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-sm text-slate-600 dark:bg-[#1e2a3a] dark:border-white/5 dark:text-[#94a3b8]">Loading account step...</section>}>
          <BookingCustomerAuthStep />
        </Suspense>
      </div>
        </main>
      </div>
    </div>
  );
}
