"use client";

import { useState, useRef, useEffect } from "react";
import { Upload, Calendar } from "lucide-react";
import { triggerAnalyticsRefresh } from "@/lib/analyticsRefresh";

function getAuthHeaders() {
  const token = sessionStorage.getItem("hotel_saas_token_staff")?.trim() ?? "";
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

export default function WalkInBookingSection({ initialRoomNumber, onBookingCreated }: { initialRoomNumber?: string; onBookingCreated?: (id: string) => void }) {
  const [message, setMessage] = useState("");
  const [walkInIdentityFile, setWalkInIdentityFile] = useState<File | null>(null);
  const [walkInSubmitting, setWalkInSubmitting] = useState(false);
  const [walkIn, setWalkIn] = useState({
    roomNumber: "",
    arrivalDate: new Date().toISOString().slice(0, 10),
    nights: 1,
    adults: 1,
    children: 0,
    pricingPlan: "BED_ONLY" as "BED_ONLY" | "BED_BREAKFAST",
    fullName: "",
    email: "",
    phone: "",
    identityDocumentUrl: "",
  });
  const [bookingId, setBookingId] = useState("");

  useEffect(() => {
    if (initialRoomNumber && !walkIn.roomNumber) {
      setWalkIn((v) => ({ ...v, roomNumber: initialRoomNumber }));
    }
  }, [initialRoomNumber]);

  async function createWalkInBooking(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setWalkInSubmitting(true);
    try {
      let identityDocumentUrl = walkIn.identityDocumentUrl.trim();
      if (walkInIdentityFile) {
        const form = new FormData();
        form.append("file", walkInIdentityFile);
        const uploadRes = await fetch("/api/uploads/id-doc", {
          method: "POST",
          body: form,
        });
        const uploadPayload = await uploadRes.json().catch(() => ({}));
        if (!uploadRes.ok) {
          setMessage(uploadPayload.message ?? "Failed to upload ID/passport document");
          return;
        }
        identityDocumentUrl = String(uploadPayload.url ?? "").trim();
      }
      if (!identityDocumentUrl) {
        setMessage("Upload ID/Passport file or provide document URL.");
        return;
      }
      const payload = {
        roomId: walkIn.roomNumber,
        arrivalDate: walkIn.arrivalDate,
        nights: Number(walkIn.nights),
        guests: { adults: Number(walkIn.adults), children: Number(walkIn.children) },
        pricingPlan: walkIn.pricingPlan,
        guest: {
          fullName: walkIn.fullName,
          email: walkIn.email,
          phone: walkIn.phone,
          identityDocumentUrl,
          privacyAccepted: true,
        },
        idempotencyKey: crypto.randomUUID(),
      };
      const response = await fetch("/api/reception/walk-in", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(data.message ?? "Failed to create walk-in booking");
        return;
      }
      const createdBookingId = data?.booking?._id ?? "";
      if (createdBookingId) {
        setBookingId(createdBookingId);
        onBookingCreated?.(createdBookingId);
        setWalkInIdentityFile(null);
        setWalkIn((value) => ({ ...value, identityDocumentUrl }));
        setMessage(`Walk-in booking created. Booking ID: ${createdBookingId}`);
        triggerAnalyticsRefresh();
        return;
      }
      setMessage("Walk-in booking created.");
      triggerAnalyticsRefresh();
    } finally {
      setWalkInSubmitting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-6 shadow-sm transition-all duration-200">
      <div>
        <h2 className="text-xl font-serif font-semibold text-slate-900 dark:text-slate-100">Create Walk-In Booking</h2>
        <p className="text-sm text-indigo-500 dark:text-indigo-400 mt-1 mb-5">
          Instruction: Enter numbers only for Room Number, Nights, Adults, and Children. Example: Room 301, Nights 2, Adults 2, Children 1.
        </p>
      </div>

      {message ? <p className="mb-3 rounded-xl bg-slate-100 dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-800 dark:text-slate-200">{message}</p> : null}

      <form onSubmit={createWalkInBooking} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Room Number (numbers only, e.g. 101)</span>
          <input
            className="w-full px-4 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-all duration-200"
            placeholder="Room Number (e.g. 101)"
            value={walkIn.roomNumber}
            onChange={(e) => setWalkIn((v) => ({ ...v, roomNumber: e.target.value }))}
            required
          />
        </label>
        <label className="flex flex-col gap-1.5 relative">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Arrival Date</span>
          <input
            className="w-full px-4 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-all duration-200"
            type="date"
            value={walkIn.arrivalDate}
            onChange={(e) => setWalkIn((v) => ({ ...v, arrivalDate: e.target.value }))}
            required
          />
          <Calendar size={16} className="absolute right-3 top-[38px] text-slate-400 pointer-events-none" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Nights (how many nights customer will stay)</span>
          <input
            className="w-full px-4 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-all duration-200"
            type="number"
            min={1}
            value={walkIn.nights}
            onChange={(e) => setWalkIn((v) => ({ ...v, nights: Number(e.target.value) }))}
            required
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Pricing Plan</span>
          <select
            className="w-full px-4 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-all duration-200"
            value={walkIn.pricingPlan}
            onChange={(e) => setWalkIn((v) => ({ ...v, pricingPlan: e.target.value as "BED_ONLY" | "BED_BREAKFAST" }))}
          >
            <option value="BED_ONLY">BED_ONLY</option>
            <option value="BED_BREAKFAST">BED_BREAKFAST</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Adults (age 13+)</span>
          <input
            className="w-full px-4 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-all duration-200"
            type="number"
            min={1}
            value={walkIn.adults}
            onChange={(e) => setWalkIn((v) => ({ ...v, adults: Number(e.target.value) }))}
            required
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Children (age 0-12)</span>
          <input
            className="w-full px-4 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-all duration-200"
            type="number"
            min={0}
            value={walkIn.children}
            onChange={(e) => setWalkIn((v) => ({ ...v, children: Number(e.target.value) }))}
            required
          />
        </label>
        <input
          className="w-full px-4 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-all duration-200"
          placeholder="Guest Full Name"
          value={walkIn.fullName}
          onChange={(e) => setWalkIn((v) => ({ ...v, fullName: e.target.value }))}
          required
        />
        <input
          className="w-full px-4 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-all duration-200"
          placeholder="Guest Email"
          type="email"
          value={walkIn.email}
          onChange={(e) => setWalkIn((v) => ({ ...v, email: e.target.value }))}
          required
        />
        <input
          className="w-full px-4 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-all duration-200"
          placeholder="Guest Phone"
          value={walkIn.phone}
          onChange={(e) => setWalkIn((v) => ({ ...v, phone: e.target.value }))}
          required
        />

        <div className="md:col-span-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Upload ID/Passport File (jpg, png, pdf, max 5MB)</span>
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl p-6 text-center hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-all duration-200 cursor-pointer">
              <div className="flex flex-col items-center gap-2 mb-3">
                <Upload size={24} className="text-slate-400 dark:text-slate-500" />
                <p className="text-xs text-slate-400 dark:text-slate-500">Click to upload ID/Passport</p>
              </div>
              <input
                className="w-full text-sm text-slate-500 dark:text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:text-xs file:font-semibold file:bg-indigo-50 dark:file:bg-indigo-900/20 file:text-indigo-600 dark:file:text-indigo-400 file:border-0 hover:file:bg-indigo-100 dark:hover:file:bg-indigo-900/30 file:transition-all file:duration-200"
                type="file"
                accept="image/jpeg,image/png,application/pdf"
                onChange={(e) => setWalkInIdentityFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </label>
        </div>

        <label className="flex flex-col gap-1.5 md:col-span-2">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Identity Document URL (optional if file uploaded)</span>
          <input
            className="w-full px-4 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-all duration-200"
            placeholder="/uploads/ids/file.jpg"
            value={walkIn.identityDocumentUrl}
            onChange={(e) => setWalkIn((v) => ({ ...v, identityDocumentUrl: e.target.value }))}
          />
        </label>

        {walkInIdentityFile ? (
          <p className="text-xs text-slate-600 dark:text-slate-400 md:col-span-2">Selected file: {walkInIdentityFile.name}</p>
        ) : null}

        <button
          className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 active:scale-[0.99] shadow-md hover:shadow-lg hover:shadow-indigo-500/25 transition-all duration-200 disabled:opacity-60 md:col-span-2"
          type="submit"
          disabled={walkInSubmitting}
        >
          {walkInSubmitting ? "Creating Booking..." : "Create Booking for Customer"}
        </button>

        <p className="text-xs text-center text-slate-400 dark:text-slate-500 mt-3 md:col-span-2">
          Use room number (for example 101). Mongo ID is no longer required here.
        </p>
      </form>
    </section>
  );
}
