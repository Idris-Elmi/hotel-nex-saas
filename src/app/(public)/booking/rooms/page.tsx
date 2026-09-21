import type { Metadata } from "next";
import Link from "next/link";
import { BookingStepper } from "@/components/public/booking-stepper";
import BookingHeader from "@/components/BookingHeader";

export const metadata: Metadata = {
  title: "Room Selection",
  description: "Compare available rooms and choose your plan.",
};

type SearchParams = Promise<{ arrivalDate?: string; nights?: string; adults?: string; children?: string }>;

type AvailabilityRoom = {
  id: string;
  roomNumber: string;
  images?: string[];
  type: {
    _id: string;
    name: string;
    code: string;
  };
  capacity: number;
  pricing: {
    BED_ONLY: { total: number };
    BED_BREAKFAST: { total: number };
  };
};

type AvailabilityResponse = {
  rooms: AvailabilityRoom[];
  errorMessage: string | null;
};

async function getAvailability(arrivalDate: string, nights: string, guests: string) {
  const params = new URLSearchParams({ arrivalDate, nights, guests });
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const res = await fetch(`${base}/api/rooms/availability?${params.toString()}`, { cache: "no-store" });

  if (!res.ok) {
    let message = "Unable to load room availability right now. Please try again.";
    try {
      const data = await res.json();
      message = data.message ?? message;
    } catch {
      // Keep a safe fallback message when the response is not JSON.
    }

    return {
      rooms: [],
      errorMessage: message,
    } satisfies AvailabilityResponse;
  }

  const data = await res.json();
  return {
    rooms: (data.results ?? []) as AvailabilityRoom[],
    errorMessage: null,
  } satisfies AvailabilityResponse;
}

export default async function BookingRoomsPage({ searchParams }: { searchParams: SearchParams }) {
  const search = await searchParams;
  const arrivalDate = search.arrivalDate ?? new Date().toISOString().slice(0, 10);
  const nights = search.nights ?? "2";
  const adults = search.adults ?? "2";
  const children = search.children ?? "0";

  const totalGuests = String(Math.max(Number(adults) + Number(children), 1));
  const availability = await getAvailability(arrivalDate, nights, totalGuests);
  const rooms = availability.rooms;

  return (
    <div className="min-h-screen bg-[#f0f2f5] dark:bg-[#0f1623] transition-colors duration-200">
      <BookingHeader currentStep={2} />
      <div className="pt-16">
        <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <BookingStepper current={2} />

      <h1 className="mt-6 text-3xl font-black text-slate-900 dark:text-white">Step 2: Room selection</h1>
      <p className="mt-2 text-slate-600 dark:text-[#94a3b8]">{rooms.length} rooms available for your selected dates.</p>

      {availability.errorMessage ? (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-300">
          {availability.errorMessage}
        </p>
      ) : null}

      {!availability.errorMessage && rooms.length === 0 ? (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:bg-[#1e2a3a] dark:border-white/5 dark:text-[#94a3b8]">
          No rooms are available for these dates and guest count. Try changing your arrival date or number of nights.
        </div>
      ) : null}

      <section className="mt-6 grid gap-5 md:grid-cols-2">
        {rooms.map((room) => (
          <article key={room.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:bg-[#1e2a3a] dark:border-white/5">
            {room.images?.[0] ? (
              <img
                src={room.images[0]}
                alt={`${room.type?.name ?? "Room"} preview`}
                className="mb-3 h-44 w-full rounded-xl border border-slate-200 object-cover dark:border-white/5"
              />
            ) : (
              <div className="mb-3 flex h-44 w-full items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500 dark:bg-[#243044] dark:border-[#2a3a52] dark:text-[#64748b]">
                No image available
              </div>
            )}
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-[#94a3b8]">Room {room.roomNumber}</p>
            <h2 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{room.type?.name ?? "Room"}</h2>
            <p className="text-sm text-slate-600 dark:text-[#94a3b8]">Type {room.type?.code} - Capacity {room.capacity}</p>

            <div className="mt-4 grid gap-2 text-sm text-slate-700 dark:text-[#94a3b8]">
              <p>Bed Only: <strong className="dark:text-white">ETB {room.pricing.BED_ONLY.total.toFixed(2)}</strong></p>
              <p>Bed & Breakfast: <strong className="dark:text-white">ETB {room.pricing.BED_BREAKFAST.total.toFixed(2)}</strong></p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={`/booking/rooms/${room.id}?arrivalDate=${arrivalDate}&nights=${nights}&guests=${totalGuests}`}
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-800 dark:bg-[#243044] dark:text-white dark:border-[#2a3a52] dark:hover:bg-[#2a3a52]"
              >
                View details
              </Link>
              <Link
                href={`/booking/guest?roomId=${room.id}&arrivalDate=${arrivalDate}&nights=${nights}&adults=${adults}&children=${children}&pricingPlan=BED_ONLY`}
                className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white dark:bg-[#2a3a52]"
              >
                Choose Bed Only
              </Link>
              <Link
                href={`/booking/guest?roomId=${room.id}&arrivalDate=${arrivalDate}&nights=${nights}&adults=${adults}&children=${children}&pricingPlan=BED_BREAKFAST`}
                className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-slate-950"
              >
                Choose B&B
              </Link>
            </div>
          </article>
        ))}
      </section>
        </main>
      </div>
    </div>
  );
}
