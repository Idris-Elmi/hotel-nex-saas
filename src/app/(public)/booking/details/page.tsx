import type { Metadata } from "next";
import { BookingStepper } from "@/components/public/booking-stepper";

export const metadata: Metadata = {
  title: "Booking Details",
  description: "Choose travel dates and guest count to start your booking.",
};

export default function BookingDetailsPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <BookingStepper current={1} />

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-black text-slate-900">Step 1: Booking details</h1>
        <p className="mt-2 text-slate-600">Set your dates and party size to check real-time room availability.</p>

        <form action="/booking/rooms" method="GET" className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            Arrival date
            <input className="rounded-lg border border-slate-300 px-3 py-2" type="date" name="arrivalDate" required />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            Nights
            <input className="rounded-lg border border-slate-300 px-3 py-2" type="number" min={1} max={30} name="nights" defaultValue={2} required />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            Adults
            <input className="rounded-lg border border-slate-300 px-3 py-2" type="number" min={1} max={10} name="adults" defaultValue={2} required />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            Children
            <input className="rounded-lg border border-slate-300 px-3 py-2" type="number" min={0} max={10} name="children" defaultValue={0} required />
          </label>
          <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white md:col-span-2" type="submit">
            Continue to room selection
          </button>
        </form>
      </section>
    </main>
  );
}
