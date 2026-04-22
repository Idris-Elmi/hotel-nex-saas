import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { publicRoomCatalog } from "@/lib/public-room-catalog";

type Props = {
  params: Promise<{ roomId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { roomId } = await params;
  const room = publicRoomCatalog.find((item) => item.id === roomId);

  return {
    title: room?.name ?? "Room",
    description: room?.shortDescription ?? "Room details and amenities.",
  };
}

export default async function RoomDetailsPage({ params }: Props) {
  const { roomId } = await params;
  const room = publicRoomCatalog.find((item) => item.id === roomId);

  if (!room) {
    notFound();
  }

  const bedOnly = room.pricing.bedOnly;
  const bedBreakfast = room.pricing.bedBreakfast;

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <img
          src={room.sampleImages[0]}
          alt={`${room.name} sample`}
          className="mb-4 h-72 w-full rounded-2xl border border-slate-200 object-cover"
        />
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{room.type}</p>
        <h1 className="mt-2 text-4xl font-black text-slate-900">{room.name}</h1>
        <p className="mt-2 text-slate-600">{room.description}</p>

        <div className="mt-6 flex flex-wrap gap-2">
          {room.amenities.map((amenity) => (
            <span key={amenity} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {amenity}
            </span>
          ))}
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {room.sampleImages.slice(1).map((image) => (
            <img
              key={image}
              src={image}
              alt={`${room.name} sample view`}
              className="h-44 w-full rounded-xl border border-slate-200 object-cover"
            />
          ))}
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl bg-slate-50 p-5">
            <h2 className="text-xl font-bold text-slate-900">Bed Only</h2>
            <p className="mt-2 text-sm text-slate-600">Flexible stay package.</p>
            <p className="mt-4 text-2xl font-black text-slate-900">${bedOnly.toFixed(2)}</p>
            <Link
              href="/booking/detail"
              className="mt-4 inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Book this room
            </Link>
          </article>

          <article className="rounded-2xl bg-amber-50 p-5">
            <h2 className="text-xl font-bold text-slate-900">Bed and Breakfast</h2>
            <p className="mt-2 text-sm text-slate-600">Breakfast included package.</p>
            <p className="mt-4 text-2xl font-black text-slate-900">${bedBreakfast.toFixed(2)}</p>
            <Link
              href="/booking/detail"
              className="mt-4 inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Book this room
            </Link>
          </article>
        </div>
      </section>
    </main>
  );
}
