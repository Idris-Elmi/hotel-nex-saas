"use client";

import { useRef, useState } from "react";
import { RoleGate } from "@/components/auth/RoleGate";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export default function ReceptionPage() {
  return (
    <RoleGate allow={["RECEPTIONIST", "ADMIN"]} loginRoute="/auth/staff-signin">
      <ReceptionContent />
    </RoleGate>
  );
}

function ReceptionContent() {
  type AvailabilityRoom = {
    id: string;
    roomNumber: string;
    capacity: number;
    type?: {
      name?: string;
      code?: string;
    } | null;
    pricing?: {
      BED_ONLY?: {
        perNight?: number;
        addons?: number;
        subtotal?: number;
        taxes?: number;
        total?: number;
        currency?: string;
      };
      BED_BREAKFAST?: {
        perNight?: number;
        addons?: number;
        subtotal?: number;
        taxes?: number;
        total?: number;
        currency?: string;
      };
    };
  };

  type DetailedBooking = {
    _id: string;
    bookingRef: string;
    status: string;
    paymentStatus?: string;
    pricingPlan: string;
    guests?: {
      adults?: number;
      children?: number;
    };
    arrivalDate: string;
    departureDate: string;
    nights?: number;
    totalPrice: number;
    amountPaid?: number;
    pricing?: {
      perNight?: number;
      addons?: number;
      subtotal?: number;
      taxes?: number;
      total?: number;
      currency?: string;
    };
    roomId: string;
    room: {
      id: string;
      roomNumber: string;
      status?: string;
    } | null;
    customer: {
      id: string;
      name: string;
      email: string;
      phone?: string;
      role?: string;
      identityType?: string;
      passportDocumentUrl?: string;
      provider?: string;
    } | null;
    guestSnapshot?: {
      fullName?: string;
      email?: string;
      phone?: string;
      identityDocumentUrl?: string;
    };
    createdAt?: string;
    checkInAt?: string;
    checkOutAt?: string;
    cancelledAt?: string;
  };

  const [bookingId, setBookingId] = useState("");
  const [message, setMessage] = useState("");
  const [availableRooms, setAvailableRooms] = useState<AvailabilityRoom[]>([]);
  const [selectedAvailabilityRoomId, setSelectedAvailabilityRoomId] = useState("");
  const [availabilityDetailExpanded, setAvailabilityDetailExpanded] = useState(false);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingsError, setBookingsError] = useState("");
  const [detailedBookings, setDetailedBookings] = useState<DetailedBooking[]>([]);
  const [selectedBookingId, setSelectedBookingId] = useState("");
  const [bookingActionLoading, setBookingActionLoading] = useState(false);
  const [detailedBookingsExpanded, setDetailedBookingsExpanded] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<"transfer" | "cash">("transfer");
  const [paymentTransaction, setPaymentTransaction] = useState("");
  const [paymentReceiptFile, setPaymentReceiptFile] = useState<File | null>(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState("");
  const [walkInIdentityFile, setWalkInIdentityFile] = useState<File | null>(null);
  const [walkInSubmitting, setWalkInSubmitting] = useState(false);
  const walkInSectionRef = useRef<HTMLElement | null>(null);
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

  function goToSection(sectionId: string) {
    const target = document.getElementById(sectionId);
    if (!target) {
      return;
    }

    const headerOffset = 88;
    const targetTop = target.getBoundingClientRect().top + window.scrollY - headerOffset;
    window.scrollTo({ top: targetTop, behavior: "smooth" });
  }

  function getAuthHeaders() {
    const token = localStorage.getItem("hotel_saas_token")?.trim() ?? "";
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  }

  async function post(endpoint: string, body?: unknown) {
    setMessage("");
    const response = await fetch(endpoint, {
      method: "POST",
      headers: getAuthHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(payload.message ?? "Request failed");
      return;
    }

    setMessage("Action completed successfully.");
  }

  async function loadDetailedBookings() {
    setBookingsLoading(true);
    setBookingsError("");

    const response = await fetch("/api/admin/bookings", {
      headers: getAuthHeaders(),
      cache: "no-store",
    });

    const payload = await response.json().catch(() => ({}));
    setBookingsLoading(false);

    if (!response.ok) {
      setBookingsError(payload.message ?? "Failed to load booking details");
      return;
    }

    const bookings = (payload.bookings ?? []) as DetailedBooking[];
    setDetailedBookings(bookings);
    if (!selectedBookingId && bookings.length > 0) {
      setSelectedBookingId(bookings[0]._id);
    }
  }

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
        guests: {
          adults: Number(walkIn.adults),
          children: Number(walkIn.children),
        },
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
        setWalkInIdentityFile(null);
        setWalkIn((value) => ({ ...value, identityDocumentUrl }));
        setMessage(`Walk-in booking created. Booking ID: ${createdBookingId}`);
        return;
      }

      setMessage("Walk-in booking created.");
    } finally {
      setWalkInSubmitting(false);
    }
  }

  async function loadAvailableRooms() {
    setMessage("");
    const totalGuests = Math.max(Number(walkIn.adults) + Number(walkIn.children), 1);
    const query = new URLSearchParams({
      arrivalDate: walkIn.arrivalDate,
      nights: String(walkIn.nights),
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
    setWalkIn((v) => ({ ...v, roomNumber }));
    setMessage(`Room ${roomNumber} selected for walk-in booking.`);
    walkInSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function cancelBooking(id: string) {
    setBookingActionLoading(true);
    setBookingsError("");

    const response = await fetch(`/api/admin/bookings/${id}/cancel`, {
      method: "POST",
      headers: getAuthHeaders(),
    });

    const payload = await response.json().catch(() => ({}));
    setBookingActionLoading(false);

    if (!response.ok) {
      setBookingsError(payload.message ?? "Failed to cancel booking");
      return;
    }

    await loadDetailedBookings();
  }

  async function deleteBooking(id: string) {
    const shouldDelete = window.confirm("Delete this booking and its payment records permanently?");
    if (!shouldDelete) {
      return;
    }

    setBookingActionLoading(true);
    setBookingsError("");

    const response = await fetch(`/api/admin/bookings/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });

    const payload = await response.json().catch(() => ({}));
    setBookingActionLoading(false);

    if (!response.ok) {
      setBookingsError(payload.message ?? "Failed to delete booking");
      return;
    }

    const remaining = detailedBookings.filter((booking) => booking._id !== id);
    setDetailedBookings(remaining);
    setSelectedBookingId(remaining[0]?._id ?? "");
  }

  async function uploadReceiptIfNeeded() {
    if (!paymentReceiptFile) {
      return "";
    }

    const form = new FormData();
    form.append("file", paymentReceiptFile);

    const uploadRes = await fetch("/api/uploads/payment-receipt", {
      method: "POST",
      body: form,
    });

    const uploadPayload = await uploadRes.json().catch(() => ({}));
    if (!uploadRes.ok) {
      throw new Error(uploadPayload.message ?? "Failed to upload receipt file");
    }

    return String(uploadPayload.url ?? "");
  }

  async function submitReceptionPayment(e: React.FormEvent) {
    e.preventDefault();
    setPaymentMessage("");

    if (!bookingId.trim()) {
      setPaymentMessage("Booking ID is required.");
      return;
    }

    if (paymentAmount <= 0) {
      setPaymentMessage("Payment amount must be greater than zero.");
      return;
    }

    const hasTransaction = paymentTransaction.trim().length > 0;
    const hasFile = Boolean(paymentReceiptFile);
    const isCash = paymentMethod === "cash";

    if (!isCash && !hasTransaction && !hasFile) {
      setPaymentMessage("Provide transaction number or receipt file, or select Cash Payment.");
      return;
    }

    setPaymentSubmitting(true);

    try {
      const receiptUrl = await uploadReceiptIfNeeded();

      const response = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: bookingId.trim(),
          amount: paymentAmount,
          method: paymentMethod,
          transactionReference: hasTransaction ? paymentTransaction.trim() : undefined,
          receiptUrl: receiptUrl || undefined,
          status: "PENDING",
          idempotencyKey: crypto.randomUUID(),
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setPaymentMessage(payload.message ?? "Failed to submit payment");
        return;
      }

      setPaymentMessage("Payment submitted with Pending status. Admin will approve or reject.");
      setPaymentTransaction("");
      setPaymentReceiptFile(null);
      setPaymentMethod("transfer");
    } catch (submissionError) {
      const text = submissionError instanceof Error ? submissionError.message : "Failed to submit payment";
      setPaymentMessage(text);
    } finally {
      setPaymentSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-24">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reception Menu</p>
          <nav className="mt-3 grid gap-2">
            <a
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              href="#customer-bookings"
              onClick={(e) => {
                e.preventDefault();
                goToSection("customer-bookings");
              }}
            >
              Customer Booking Details
            </a>
            <a
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              href="#availability"
              onClick={(e) => {
                e.preventDefault();
                goToSection("availability");
              }}
            >
              Room Availability Checking
            </a>
            <a
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              href="#payment-submit"
              onClick={(e) => {
                e.preventDefault();
                goToSection("payment-submit");
              }}
            >
              Payment Submission
            </a>
            <a
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              href="#walkin"
              onClick={(e) => {
                e.preventDefault();
                goToSection("walkin");
              }}
            >
              Walk-In Booking
            </a>
            <a
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              href="#manage"
              onClick={(e) => {
                e.preventDefault();
                goToSection("manage");
              }}
            >
              Manage Booking
            </a>
          </nav>
        </aside>

        <section>
          <h1 className="mb-3 text-3xl font-black text-slate-900">Reception Desk</h1>
          <p className="mb-6 text-slate-600">All reception tools in one place: booking details, availability, walk-in, and booking management.</p>

          {message ? <p className="mb-4 rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-800">{message}</p> : null}

          <section id="customer-bookings" className="mb-6 scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Detailed Customer Bookings</h2>
                <p className="text-sm text-slate-600">Includes booking ID, room ID, room number, customer profile, and stay details.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-800"
                  onClick={() => setDetailedBookingsExpanded((value) => !value)}
                  type="button"
                >
                  {detailedBookingsExpanded ? "Fold Up" : "Fold Down"}
                </button>
                <button
                  className="rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                  onClick={loadDetailedBookings}
                  disabled={bookingsLoading}
                  type="button"
                >
                  {bookingsLoading ? "Loading..." : "Load Booking Details"}
                </button>
              </div>
            </div>

            {!detailedBookingsExpanded ? <p className="text-sm text-slate-500">Detailed bookings are folded. Click Fold Down to expand.</p> : null}

            {detailedBookingsExpanded ? (
              <>
                {bookingsError ? <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{bookingsError}</p> : null}

                <div className="grid gap-2">
                  {detailedBookings.map((booking) => (
                    <article
                      key={booking._id}
                      onClick={() => {
                        setSelectedBookingId(booking._id);
                        setBookingId(booking._id);
                      }}
                      className={`cursor-pointer rounded-xl border p-4 transition ${selectedBookingId === booking._id ? "border-slate-900 bg-slate-50" : "border-slate-200"}`}
                    >
                      <p className="font-semibold text-slate-900">
                        Booking ID: {booking._id} | Ref: {booking.bookingRef} | Status: {booking.status} | Payment: {booking.paymentStatus ?? "PENDING"}
                      </p>
                      <p className="mt-1 text-sm text-slate-700">
                        Room ID: {booking.roomId} | Room Number: {booking.room?.roomNumber ?? "Unknown"} | Room Status: {booking.room?.status ?? "N/A"}
                      </p>
                      <p className="mt-1 text-sm text-slate-700">
                        Customer: {booking.customer?.name ?? booking.guestSnapshot?.fullName ?? "Unknown"} ({booking.customer?.email ?? booking.guestSnapshot?.email ?? "N/A"}) | Phone: {booking.customer?.phone ?? booking.guestSnapshot?.phone ?? "N/A"}
                      </p>
                      <p className="mt-1 text-sm text-slate-700">
                        Stay: {new Date(booking.arrivalDate).toLocaleDateString()} to {new Date(booking.departureDate).toLocaleDateString()} | Plan: {booking.pricingPlan} | Total: {formatCurrency(booking.totalPrice)}
                      </p>
                      <p className="mt-2 text-xs text-slate-500">Click to view full booking detail and actions.</p>
                    </article>
                  ))}
                  {!bookingsLoading && detailedBookings.length === 0 ? <p className="text-sm text-slate-500">No booking details loaded yet.</p> : null}
                </div>

                {selectedBookingId ? (
                  <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                    {(() => {
                      const booking = detailedBookings.find((item) => item._id === selectedBookingId);
                      if (!booking) {
                        return <p className="text-sm text-slate-600">Select a booking to view details.</p>;
                      }

                      return (
                    <div className="grid gap-3">
                      <p className="text-base font-bold text-slate-900">Selected Booking Detail</p>
                      <p><strong>Booking ID:</strong> {booking._id}</p>
                      <p><strong>Booking Ref:</strong> {booking.bookingRef}</p>
                      <p><strong>Status:</strong> {booking.status}</p>
                      <p><strong>Payment Status:</strong> {booking.paymentStatus ?? "PENDING"}</p>
                      <p><strong>Room ID:</strong> {booking.roomId}</p>
                      <p><strong>Room Number:</strong> {booking.room?.roomNumber ?? "Unknown"}</p>
                      <p><strong>Room Status:</strong> {booking.room?.status ?? "N/A"}</p>
                      <p><strong>Arrival:</strong> {new Date(booking.arrivalDate).toLocaleDateString()}</p>
                      <p><strong>Departure:</strong> {new Date(booking.departureDate).toLocaleDateString()}</p>
                      <p><strong>Nights:</strong> {booking.nights ?? "N/A"}</p>
                      <p><strong>Plan:</strong> {booking.pricingPlan}</p>
                      <p><strong>Total:</strong> {formatCurrency(booking.totalPrice)}</p>
                      <p><strong>Amount Paid:</strong> {formatCurrency(booking.amountPaid ?? 0)}</p>
                      <p><strong>Per Night:</strong> {formatCurrency(booking.pricing?.perNight ?? 0)}</p>
                      <p><strong>Addons:</strong> {formatCurrency(booking.pricing?.addons ?? 0)}</p>
                      <p><strong>Subtotal:</strong> {formatCurrency(booking.pricing?.subtotal ?? 0)}</p>
                      <p><strong>Taxes:</strong> {formatCurrency(booking.pricing?.taxes ?? 0)}</p>

                      <div className="mt-2 rounded-lg border border-slate-200 bg-white p-3">
                        <p className="mb-2 font-semibold text-slate-900">Step 3: Guest Information</p>
                        <p><strong>Guest Name:</strong> {booking.guestSnapshot?.fullName ?? "N/A"}</p>
                        <p><strong>Guest Email:</strong> {booking.guestSnapshot?.email ?? "N/A"}</p>
                        <p><strong>Guest Phone:</strong> {booking.guestSnapshot?.phone ?? "N/A"}</p>
                        <p>
                          <strong>Guest ID Document:</strong>{" "}
                          {booking.guestSnapshot?.identityDocumentUrl ? (
                            <a
                              href={booking.guestSnapshot.identityDocumentUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="font-semibold text-sky-700 underline"
                            >
                              Open ID/Passport File
                            </a>
                          ) : (
                            "N/A"
                          )}
                        </p>
                      </div>

                      <div className="rounded-lg border border-slate-200 bg-white p-3">
                        <p className="mb-2 font-semibold text-slate-900">Step 4: Account Information</p>
                        <p><strong>Account Name:</strong> {booking.customer?.name ?? booking.guestSnapshot?.fullName ?? "Unknown"}</p>
                        <p><strong>Account Email:</strong> {booking.customer?.email ?? booking.guestSnapshot?.email ?? "N/A"}</p>
                        <p><strong>Account Phone:</strong> {booking.customer?.phone ?? booking.guestSnapshot?.phone ?? "N/A"}</p>
                        <p><strong>Account Role:</strong> {booking.customer?.role ?? "CUSTOMER"}</p>
                        <p><strong>Sign-In Provider:</strong> {booking.customer?.provider ?? "local"}</p>
                        <p><strong>Identity Type:</strong> {booking.customer?.identityType ?? "passport"}</p>
                        <p><strong>Account ID Document:</strong> {booking.customer?.passportDocumentUrl ?? booking.guestSnapshot?.identityDocumentUrl ?? "N/A"}</p>
                      </div>

                      {booking.createdAt ? <p><strong>Created At:</strong> {new Date(booking.createdAt).toLocaleString()}</p> : null}

                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                          onClick={() => cancelBooking(booking._id)}
                          disabled={bookingActionLoading}
                        >
                          {bookingActionLoading ? "Working..." : "Cancel Booking"}
                        </button>
                        <button
                          className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                          onClick={() => deleteBooking(booking._id)}
                          disabled={bookingActionLoading}
                        >
                          {bookingActionLoading ? "Working..." : "Delete Booking Detail"}
                        </button>
                      </div>
                    </div>
                      );
                    })()}
                  </div>
                ) : null}
              </>
            ) : null}
          </section>

          <section id="availability" className="mb-6 scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">Room Available Checking</h2>
              <button className="rounded-md bg-slate-900 px-3 py-1 text-xs font-semibold text-white" onClick={loadAvailableRooms} type="button">
                Load Availability
              </button>
            </div>
            <p className="mb-3 text-sm text-slate-600">Checks public room availability using arrival date and total guests from walk-in form.</p>

            <div className="grid gap-2">
              {availableRooms.map((room) => (
                <div key={room.id} className="rounded-md border border-slate-200 px-3 py-2 text-xs text-slate-700">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p>Room {room.roomNumber} {room.type?.name ? `(${room.type.name})` : ""} | Capacity: {room.capacity}</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => useRoomForWalkIn(room.roomNumber)}
                        className="rounded-md bg-slate-900 px-3 py-1 text-xs font-semibold text-white"
                      >
                        Use Room
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleAvailabilityDetail(room.id)}
                        className="rounded-md border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-800"
                      >
                        {selectedAvailabilityRoomId === room.id && availabilityDetailExpanded ? "Fold Up" : "Detail"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {availableRooms.length === 0 ? <p className="text-xs text-slate-500">No availability loaded yet.</p> : null}
            </div>

            {selectedAvailabilityRoom && availabilityDetailExpanded ? (
              <section className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <p className="text-base font-bold text-slate-900">Selected Room Detail</p>
                <p><strong>Room ID:</strong> {selectedAvailabilityRoom.id}</p>
                <p><strong>Room Number:</strong> {selectedAvailabilityRoom.roomNumber}</p>
                <p><strong>Type:</strong> {selectedAvailabilityRoom.type?.name ?? "N/A"} ({selectedAvailabilityRoom.type?.code ?? "-"})</p>
                <p><strong>Capacity:</strong> {selectedAvailabilityRoom.capacity}</p>

                <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
                  <p className="mb-1 font-semibold text-slate-900">Bed Only Pricing</p>
                  <p><strong>Per Night:</strong> {formatCurrency(selectedAvailabilityRoom.pricing?.BED_ONLY?.perNight ?? 0)}</p>
                  <p><strong>Addons:</strong> {formatCurrency(selectedAvailabilityRoom.pricing?.BED_ONLY?.addons ?? 0)}</p>
                  <p><strong>Subtotal:</strong> {formatCurrency(selectedAvailabilityRoom.pricing?.BED_ONLY?.subtotal ?? 0)}</p>
                  <p><strong>Taxes:</strong> {formatCurrency(selectedAvailabilityRoom.pricing?.BED_ONLY?.taxes ?? 0)}</p>
                  <p><strong>Total:</strong> {formatCurrency(selectedAvailabilityRoom.pricing?.BED_ONLY?.total ?? 0)}</p>
                </div>

                <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
                  <p className="mb-1 font-semibold text-slate-900">Bed & Breakfast Pricing</p>
                  <p><strong>Per Night:</strong> {formatCurrency(selectedAvailabilityRoom.pricing?.BED_BREAKFAST?.perNight ?? 0)}</p>
                  <p><strong>Addons:</strong> {formatCurrency(selectedAvailabilityRoom.pricing?.BED_BREAKFAST?.addons ?? 0)}</p>
                  <p><strong>Subtotal:</strong> {formatCurrency(selectedAvailabilityRoom.pricing?.BED_BREAKFAST?.subtotal ?? 0)}</p>
                  <p><strong>Taxes:</strong> {formatCurrency(selectedAvailabilityRoom.pricing?.BED_BREAKFAST?.taxes ?? 0)}</p>
                  <p><strong>Total:</strong> {formatCurrency(selectedAvailabilityRoom.pricing?.BED_BREAKFAST?.total ?? 0)}</p>
                </div>
              </section>
            ) : null}
          </section>

          <section id="payment-submit" className="mb-6 scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">Payment Submission</h2>
            <p className="mt-1 text-sm text-slate-600">Reception can submit payment as pending. Only Admin can approve or reject.</p>

            {paymentMessage ? <p className="mt-3 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-800">{paymentMessage}</p> : null}

            <form onSubmit={submitReceptionPayment} className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="grid gap-1 text-sm font-semibold text-slate-700">
                Booking ID
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2"
                  value={bookingId}
                  onChange={(e) => setBookingId(e.target.value)}
                  placeholder="Paste booking ID"
                  required
                />
              </label>

              <label className="grid gap-1 text-sm font-semibold text-slate-700">
                Payment Amount
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2"
                  type="number"
                  min={0.01}
                  step="0.01"
                  value={paymentAmount || ""}
                  onChange={(e) => setPaymentAmount(Number(e.target.value) || 0)}
                  required
                />
              </label>

              <label className="grid gap-1 text-sm font-semibold text-slate-700">
                Payment Method
                <select
                  className="rounded-lg border border-slate-300 px-3 py-2"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as "transfer" | "cash")}
                >
                  <option value="transfer">Transfer</option>
                  <option value="cash">Cash Payment</option>
                </select>
              </label>

              <label className="grid gap-1 text-sm font-semibold text-slate-700">
                Transaction Number (optional for cash)
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2"
                  value={paymentTransaction}
                  onChange={(e) => setPaymentTransaction(e.target.value)}
                  placeholder="TRX-123456"
                />
              </label>

              <label className="grid gap-1 text-sm font-semibold text-slate-700 md:col-span-2">
                Receipt File (image/pdf, optional for cash)
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2"
                  type="file"
                  accept="image/jpeg,image/png,application/pdf"
                  onChange={(e) => setPaymentReceiptFile(e.target.files?.[0] ?? null)}
                />
              </label>

              <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 md:col-span-2">
                Rule: For Transfer, provide transaction number, receipt file, or both together. For Cash Payment, transaction/receipt are not required. Submitted status is always Pending.
              </div>

              <button
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 md:col-span-2"
                type="submit"
                disabled={paymentSubmitting}
              >
                {paymentSubmitting ? "Submitting Payment..." : "Submit Payment (Pending)"}
              </button>
            </form>
          </section>

          <section id="walkin" ref={walkInSectionRef} className="mb-6 scroll-mt-24 grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">Create Walk-In Booking</h2>
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Instruction: Enter numbers only for Room Number, Nights, Adults, and Children. Example: Room 301, Nights 2, Adults 2, Children 1.
            </p>
            <form onSubmit={createWalkInBooking} className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1 text-sm font-semibold text-slate-700">
                Room Number (numbers only, e.g. 101)
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2"
                  placeholder="Room Number (e.g. 101)"
                  value={walkIn.roomNumber}
                  onChange={(e) => setWalkIn((v) => ({ ...v, roomNumber: e.target.value }))}
                  required
                />
              </label>
              <input className="rounded-lg border border-slate-300 px-3 py-2" type="date" value={walkIn.arrivalDate} onChange={(e) => setWalkIn((v) => ({ ...v, arrivalDate: e.target.value }))} required />
              <label className="grid gap-1 text-sm font-semibold text-slate-700">
                Nights (how many nights customer will stay)
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2"
                  type="number"
                  min={1}
                  value={walkIn.nights}
                  onChange={(e) => setWalkIn((v) => ({ ...v, nights: Number(e.target.value) }))}
                  required
                />
              </label>
              <select className="rounded-lg border border-slate-300 px-3 py-2" value={walkIn.pricingPlan} onChange={(e) => setWalkIn((v) => ({ ...v, pricingPlan: e.target.value as "BED_ONLY" | "BED_BREAKFAST" }))}>
                <option value="BED_ONLY">BED_ONLY</option>
                <option value="BED_BREAKFAST">BED_BREAKFAST</option>
              </select>
              <label className="grid gap-1 text-sm font-semibold text-slate-700">
                Adults (age 13+)
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2"
                  type="number"
                  min={1}
                  value={walkIn.adults}
                  onChange={(e) => setWalkIn((v) => ({ ...v, adults: Number(e.target.value) }))}
                  required
                />
              </label>
              <label className="grid gap-1 text-sm font-semibold text-slate-700">
                Children (age 0-12)
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2"
                  type="number"
                  min={0}
                  value={walkIn.children}
                  onChange={(e) => setWalkIn((v) => ({ ...v, children: Number(e.target.value) }))}
                  required
                />
              </label>
              <input className="rounded-lg border border-slate-300 px-3 py-2" placeholder="Guest Full Name" value={walkIn.fullName} onChange={(e) => setWalkIn((v) => ({ ...v, fullName: e.target.value }))} required />
              <input className="rounded-lg border border-slate-300 px-3 py-2" placeholder="Guest Email" type="email" value={walkIn.email} onChange={(e) => setWalkIn((v) => ({ ...v, email: e.target.value }))} required />
              <input className="rounded-lg border border-slate-300 px-3 py-2" placeholder="Guest Phone" value={walkIn.phone} onChange={(e) => setWalkIn((v) => ({ ...v, phone: e.target.value }))} required />

              <label className="grid gap-1 text-sm font-semibold text-slate-700 md:col-span-2">
                Upload ID/Passport File (jpg, png, pdf, max 5MB)
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2"
                  type="file"
                  accept="image/jpeg,image/png,application/pdf"
                  onChange={(e) => setWalkInIdentityFile(e.target.files?.[0] ?? null)}
                />
              </label>

              <label className="grid gap-1 text-sm font-semibold text-slate-700 md:col-span-2">
                Identity Document URL (optional if file uploaded)
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2"
                  placeholder="/uploads/ids/file.jpg"
                  value={walkIn.identityDocumentUrl}
                  onChange={(e) => setWalkIn((v) => ({ ...v, identityDocumentUrl: e.target.value }))}
                />
              </label>

              {walkInIdentityFile ? (
                <p className="text-xs text-slate-600 md:col-span-2">Selected file: {walkInIdentityFile.name}</p>
              ) : null}

              <button className="rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 md:col-span-2" type="submit" disabled={walkInSubmitting}>
                {walkInSubmitting ? "Creating Booking..." : "Create Booking for Customer"}
              </button>

              <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600 md:col-span-2">
                Use room number (for example 101). Mongo ID is no longer required here.
              </div>
            </form>
          </section>

          <section id="manage" className="scroll-mt-24 grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">Manage Existing Booking</h2>
            <label className="grid gap-1 text-sm font-semibold text-slate-700">
              Booking ID
              <input className="rounded-lg border border-slate-300 px-3 py-2" value={bookingId} onChange={(e) => setBookingId(e.target.value)} placeholder="Paste booking ID" />
            </label>

            <div className="flex flex-wrap gap-2">
              <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white" onClick={() => post(`/api/reception/bookings/${bookingId}/check-in`)}>
                Check-In
              </button>
              <button className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white" onClick={() => post(`/api/reception/bookings/${bookingId}/check-out`, {})}>
                Check-Out
              </button>
              <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white" onClick={() => post(`/api/reception/bookings/${bookingId}/extend`, { extraNights: 1 })}>
                Extend 1 Night
              </button>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
