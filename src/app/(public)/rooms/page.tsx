import type { Metadata } from "next";
import Link from "next/link";
import { publicRoomCatalog } from "@/lib/public-room-catalog";

export const metadata: Metadata = {
  title: "Rooms",
  description: "Browse our room collection with curated sample photos and highlights.",
};
export default function RoomsPage() {
  const rooms = publicRoomCatalog;

  return (
    <main className="bg-[#f7f3eb] px-4 py-12 sm:px-6 md:py-16">
      <section className="mx-auto max-w-7xl rounded-3xl border border-[#e6dece] bg-linear-to-r from-[#201811] via-[#2d2218] to-[#3a2d20] p-8 text-white shadow-2xl md:p-12">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-200">Room Collection</p>
        <h1 className="mt-3 font-serif text-3xl leading-tight sm:text-4xl md:text-5xl">Curated stays with modern luxury</h1>
        <p className="mt-4 max-w-2xl text-amber-50/85">
          Explore elegant rooms designed for comfort, style, and a seamless booking experience.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <span className="rounded-full border border-amber-100/40 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-amber-100">All Rooms</span>
          <span className="rounded-full border border-amber-100/30 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-amber-100/90">Bed Only</span>
          <span className="rounded-full border border-amber-100/30 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-amber-100/90">Bed & Breakfast</span>
        </div>
      </section>

      <section className="mx-auto mt-10 grid max-w-7xl gap-6 lg:grid-cols-2">
        {rooms.map((room) => (
          <article
            key={room.id}
            className="group overflow-hidden rounded-3xl border border-[#e3dbcc] bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl"
          >
            <div className="relative">
              <img
                src={room.sampleImages[0]}
                alt={`${room.name} sample`}
                className="h-64 w-full object-cover transition duration-500 group-hover:scale-105 sm:h-72"
              />
              <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/45 via-black/10 to-transparent" />
              <p className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-800">
                {room.type}
              </p>
              <p className="absolute bottom-4 right-4 rounded-full bg-amber-300 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-[#2d1f10]">
                From ETB {room.pricing.bedOnly.toFixed(2)}
              </p>
            </div>

            <div className="p-6">
              <h2 className="font-serif text-2xl text-slate-900 sm:text-3xl">{room.name}</h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">{room.shortDescription}</p>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">WiFi Included</span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">Premium Bed</span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">Breakfast Option</span>
              </div>

              <div className="mt-5 grid gap-2 rounded-2xl border border-slate-200 bg-[#faf7f2] p-4 text-sm text-slate-700 sm:grid-cols-2">
                <p>
                  Bed Only: <strong>ETB {room.pricing.bedOnly.toFixed(2)}</strong>
                </p>
                <p>
                  Bed & Breakfast: <strong>ETB {room.pricing.bedBreakfast.toFixed(2)}</strong>
                </p>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <Link href={`/rooms/${room.id}`} className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-800 transition hover:border-slate-500">
                View details
                </Link>
                <Link href="/booking/detail" className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-slate-700">
                Book now
                </Link>
              </div>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
