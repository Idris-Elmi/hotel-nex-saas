import type { Metadata } from "next";
import { BookingStepper } from "@/components/public/booking-stepper";
import { BookingGuestStep } from "@/components/public/booking-guest-step";
import BookingHeader from "@/components/BookingHeader";

export const metadata: Metadata = {
  title: "Guest Information",
  description: "Add guest details before account setup.",
};

type SearchParams = Promise<{
  roomId?: string;
  arrivalDate?: string;
  nights?: string;
  adults?: string;
  children?: string;
  pricingPlan?: string;
}>;

export default async function BookingGuestPage({ searchParams }: { searchParams: SearchParams }) {
  const search = await searchParams;

  return (
    <div className="min-h-screen bg-[#f0f2f5] dark:bg-[#0f1623] transition-colors duration-200">
      <BookingHeader currentStep={3} />
      <div className="pt-16">
        <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
          <BookingStepper current={3} />

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:bg-[#1e2a3a] dark:border-white/5">
        <h1 className="text-3xl font-black text-slate-900 dark:text-white">Step 3: Guest information</h1>
        <p className="mt-2 text-slate-600 dark:text-[#94a3b8]">Provide guest details and upload Passport / ID, then continue to account setup.</p>
        <BookingGuestStep
          roomId={search.roomId ?? ""}
          arrivalDate={search.arrivalDate ?? ""}
          nights={search.nights ?? "1"}
          adults={search.adults ?? "2"}
          childCount={search.children ?? "0"}
          pricingPlan={search.pricingPlan ?? "BED_ONLY"}
        />
      </section>
        </main>
      </div>
    </div>
  );
}
