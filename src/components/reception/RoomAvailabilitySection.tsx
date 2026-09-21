"use client";

import { useState } from "react";

type AvailabilityRoom = {
  id: string;
  roomNumber: string;
  capacity: number;
  type?: { name?: string; code?: string } | null;
  pricing?: {
    BED_ONLY?: { perNight?: number; addons?: number; subtotal?: number; taxes?: number; total?: number; currency?: string };
    BED_BREAKFAST?: { perNight?: number; addons?: number; subtotal?: number; taxes?: number; total?: number; currency?: string };
  };
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "ETB", maximumFractionDigits: 2,
  }).format(value);
}

function getAuthHeaders() {
  const token = sessionStorage.getItem("hotel_saas_token_staff")?.trim() ?? "";
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

export default function RoomAvailabilitySection({ onRoomSelected }: { onRoomSelected?: (roomNumber: string) => void }) {
  const [message, setMessage] = useState("");
  const [availableRooms, setAvailableRooms] = useState<AvailabilityRoom[]>([]);
  const [selectedAvailabilityRoomId, setSelectedAvailabilityRoomId] = useState("");
  const [availabilityDetailExpanded, setAvailabilityDetailExpanded] = useState(false);
  const [searchArrivalDate, setSearchArrivalDate] = useState(new Date().toISOString().slice(0, 10));
  const [searchNights, setSearchNights] = useState(1);
  const [searchAdults, setSearchAdults] = useState(1);
  const [searchChildren, setSearchChildren] = useState(0);

  async function loadAvailableRooms() {
    setMessage("");
    const totalGuests = Math.max(Number(searchAdults) + Number(searchChildren), 1);
    const query = new URLSearchParams({
      arrivalDate: searchArrivalDate,
      nights: String(searchNights),
      guests: String(totalGuests),
    });
    const response = await fetch(`/api/rooms/availability?${query.toString()}`, { cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(payload.message ?? "Failed to load available rooms");
      return;
    }
    const rooms = (payload.results ?? []) as AvailabilityRoom[];
    setAvailableRooms(rooms);
    setSelectedAvailabilityRoomId(rooms[0]?.id ?? "");
    setAvailabilityDetailExpanded(rooms.length > 0);
    if (rooms.length === 0) {
      setMessage("No available rooms for selected date/guest count.");
    }
  }

  const selectedAvailabilityRoom = availableRooms.find((room) => room.id === selectedAvailabilityRoomId) ?? null;

  function toggleAvailabilityDetail(roomId: string) {
    if (selectedAvailabilityRoomId === roomId) {
      setAvailabilityDetailExpanded((value) => !value);
      return;
    }
    setSelectedAvailabilityRoomId(roomId);
    setAvailabilityDetailExpanded(true);
  }

  function useRoomForWalkIn(roomNumber: string) {
    setMessage(`Room ${roomNumber} selected for walk-in booking.`);
    onRoomSelected?.(roomNumber);
  }

  return (
    <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-5 shadow-sm transition-all duration-200">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h2 className="text-xl font-serif font-semibold text-slate-900 dark:text-slate-100">Room Available Checking</h2>
        <button className="rounded-xl bg-slate-900 dark:bg-slate-700 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 dark:hover:bg-slate-600 transition-all duration-200" onClick={loadAvailableRooms} type="button">
          Load Availability
        </button>
      </div>
      <p className="mb-3 text-sm text-slate-600 dark:text-slate-400">Checks public room availability using arrival date and total guests from walk-in form.</p>

      {message ? <p className="mb-3 rounded-xl bg-slate-100 dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-800 dark:text-slate-200">{message}</p> : null}

      <div className="grid gap-2">
        {availableRooms.map((room) => (
          <div key={room.id} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 px-4 py-3 text-xs text-slate-700 dark:text-slate-300">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p>Room {room.roomNumber} {room.type?.name ? `(${room.type.name})` : ""} | Capacity: {room.capacity}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => useRoomForWalkIn(room.roomNumber)}
                  className="rounded-xl bg-slate-900 dark:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 dark:hover:bg-slate-600 transition-all duration-200"
                >
                  Use Room
                </button>
                <button
                  type="button"
                  onClick={() => toggleAvailabilityDetail(room.id)}
                  className="rounded-xl border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-200"
                >
                  {selectedAvailabilityRoomId === room.id && availabilityDetailExpanded ? "Fold Up" : "Detail"}
                </button>
              </div>
            </div>
          </div>
        ))}
        {availableRooms.length === 0 ? <p className="text-xs text-slate-500 dark:text-slate-400">No availability loaded yet.</p> : null}
      </div>

      {selectedAvailabilityRoom && availabilityDetailExpanded ? (
        <section className="mt-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 p-4 text-sm text-slate-700 dark:text-slate-300">
          <p className="text-base font-bold text-slate-900 dark:text-slate-100">Selected Room Detail</p>
          <p><strong>Room ID:</strong> {selectedAvailabilityRoom.id}</p>
          <p><strong>Room Number:</strong> {selectedAvailabilityRoom.roomNumber}</p>
          <p><strong>Type:</strong> {selectedAvailabilityRoom.type?.name ?? "N/A"} ({selectedAvailabilityRoom.type?.code ?? "-"})</p>
          <p><strong>Capacity:</strong> {selectedAvailabilityRoom.capacity}</p>

          <div className="mt-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-4">
            <p className="mb-1 font-semibold text-slate-900 dark:text-slate-100">Bed Only Pricing</p>
            <p><strong>Per Night:</strong> {formatCurrency(selectedAvailabilityRoom.pricing?.BED_ONLY?.perNight ?? 0)}</p>
            <p><strong>Addons:</strong> {formatCurrency(selectedAvailabilityRoom.pricing?.BED_ONLY?.addons ?? 0)}</p>
            <p><strong>Subtotal:</strong> {formatCurrency(selectedAvailabilityRoom.pricing?.BED_ONLY?.subtotal ?? 0)}</p>
            <p><strong>Taxes:</strong> {formatCurrency(selectedAvailabilityRoom.pricing?.BED_ONLY?.taxes ?? 0)}</p>
            <p><strong>Total:</strong> {formatCurrency(selectedAvailabilityRoom.pricing?.BED_ONLY?.total ?? 0)}</p>
          </div>

          <div className="mt-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-4">
            <p className="mb-1 font-semibold text-slate-900 dark:text-slate-100">Bed & Breakfast Pricing</p>
            <p><strong>Per Night:</strong> {formatCurrency(selectedAvailabilityRoom.pricing?.BED_BREAKFAST?.perNight ?? 0)}</p>
            <p><strong>Addons:</strong> {formatCurrency(selectedAvailabilityRoom.pricing?.BED_BREAKFAST?.addons ?? 0)}</p>
            <p><strong>Subtotal:</strong> {formatCurrency(selectedAvailabilityRoom.pricing?.BED_BREAKFAST?.subtotal ?? 0)}</p>
            <p><strong>Taxes:</strong> {formatCurrency(selectedAvailabilityRoom.pricing?.BED_BREAKFAST?.taxes ?? 0)}</p>
            <p><strong>Total:</strong> {formatCurrency(selectedAvailabilityRoom.pricing?.BED_BREAKFAST?.total ?? 0)}</p>
          </div>
        </section>
      ) : null}
    </section>
  );
}
