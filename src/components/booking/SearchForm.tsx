"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SearchForm() {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [arrivalDate, setArrivalDate] = useState(today);
  const [nights, setNights] = useState(2);
  const [guests, setGuests] = useState(2);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams({
      arrivalDate,
      nights: String(nights),
      guests: String(guests),
    });
    router.push(`/rooms?${params.toString()}`);
  }

  return (
    <form onSubmit={submit} className="grid gap-4 rounded-3xl bg-white/90 p-6 shadow-xl backdrop-blur md:grid-cols-4">
      <label className="grid gap-2 text-sm font-semibold text-slate-700">
        Arrival
        <input className="rounded-xl border border-slate-300 px-3 py-2" type="date" value={arrivalDate} onChange={(e) => setArrivalDate(e.target.value)} required />
      </label>
      <label className="grid gap-2 text-sm font-semibold text-slate-700">
        Nights
        <input className="rounded-xl border border-slate-300 px-3 py-2" type="number" min={1} max={30} value={nights} onChange={(e) => setNights(Number(e.target.value))} required />
      </label>
      <label className="grid gap-2 text-sm font-semibold text-slate-700">
        Guests
        <input className="rounded-xl border border-slate-300 px-3 py-2" type="number" min={1} max={10} value={guests} onChange={(e) => setGuests(Number(e.target.value))} required />
      </label>
      <button className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 md:self-end" type="submit">
        Check Availability
      </button>
    </form>
  );
}
