import type { Metadata } from "next";
import Link from "next/link";

type Props = {
  params: Promise<{ roomId: string }>;
  searchParams: Promise<{ arrivalDate?: string; nights?: string; guests?: string }>;
};

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

async function getRoom(roomId: string, arrivalDate: string, nights: string, guests: string) {
  const params = new URLSearchParams({ arrivalDate, nights, guests });
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const res = await fetch(`${base}/api/rooms/availability?${params.toString()}`, { cache: "no-store" });

  if (!res.ok) {
    return null;
  }

  const data = await res.json();
  const rooms = (data.results ?? []) as AvailabilityRoom[];
  return rooms.find((room) => room.id === roomId) ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { roomId } = await params;
  return {
    title: `Booking Room ${roomId.slice(0, 6)}`,
    description: "Booking room details with admin-managed room images.",
  };
}

export default async function BookingRoomDetailsPage({ params, searchParams }: Props) {
  const { roomId } = await params;
  const search = await searchParams;

  const arrivalDate = search.arrivalDate ?? new Date().toISOString().slice(0, 10);
  const nights = search.nights ?? "1";
  const guests = search.guests ?? "2";

  const room = await getRoom(roomId, arrivalDate, nights, guests);

  if (!room) {
    return <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">Room not available for selected dates.</main>;
  }

  const bedOnly = room.pricing.BED_ONLY.total;
  const bedBreakfast = room.pricing.BED_BREAKFAST.total;

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        {room.images?.[0] ? (
          <img
            src={room.images[0]}
            alt={`${room.type?.name ?? "Room"} image`}
            className="mb-4 h-72 w-full rounded-2xl border border-slate-200 object-cover"
          />
        ) : null}

        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Room {room.roomNumber}</p>
        <h1 className="mt-2 text-4xl font-black text-slate-900">{room.type?.name ?? "Guest Room"}</h1>
        <p className="mt-2 text-slate-600">Type {room.type?.code} - Capacity {room.capacity} guests</p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl bg-slate-50 p-5">
            <h2 className="text-xl font-bold text-slate-900">Bed Only</h2>
            <p className="mt-2 text-sm text-slate-600">Best for guests who prefer flexibility in dining.</p>
            <p className="mt-4 text-2xl font-black text-slate-900">${bedOnly.toFixed(2)}</p>
            <Link
              href={`/booking/guest?roomId=${room.id}&arrivalDate=${arrivalDate}&nights=${nights}&adults=${guests}&children=0&pricingPlan=BED_ONLY`}
              className="mt-4 inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Select plan
            </Link>
          </article>

          <article className="rounded-2xl bg-amber-50 p-5">
            <h2 className="text-xl font-bold text-slate-900">Bed and Breakfast</h2>
            <p className="mt-2 text-sm text-slate-600">Includes breakfast for a smooth start every morning.</p>
            <p className="mt-4 text-2xl font-black text-slate-900">${bedBreakfast.toFixed(2)}</p>
            <Link
              href={`/booking/guest?roomId=${room.id}&arrivalDate=${arrivalDate}&nights=${nights}&adults=${guests}&children=0&pricingPlan=BED_BREAKFAST`}
              className="mt-4 inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Select plan
            </Link>
          </article>
        </div>
      </section>
    </main>
  );
}
