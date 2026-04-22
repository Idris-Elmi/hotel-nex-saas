import { Suspense } from "react";
import { BookingStepper } from "@/components/public/booking-stepper";
import { BookingCustomerAuthStep } from "@/components/public/booking-customer-auth-step";

export default function BookingCustomerAuthPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <BookingStepper current={4} />
      <div className="mt-6">
        <Suspense fallback={<section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-sm text-slate-600">Loading account step...</section>}>
          <BookingCustomerAuthStep />
        </Suspense>
      </div>
    </main>
  );
}
