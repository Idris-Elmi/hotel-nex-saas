import { randomUUID } from "crypto";
import { addDays } from "date-fns";
import pool from "@/lib/db/postgres";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { BookingModel } from "@/models/booking.model";
import { PaymentModel } from "@/models/payment.model";
import { RoomModel } from "@/models/room.model";
import { UserModel } from "@/models/user.model";
import { calculateBookingPrice } from "@/modules/rooms/services/pricing.service";
import { syncRoomStatus } from "@/modules/rooms/services/room-status.service";
import type { BookingStatus } from "@/models/enums";

function createBookingRef(): string {
  const stamp = Date.now().toString().slice(-8);
  return `BK-${stamp}-${randomUUID().slice(0, 6).toUpperCase()}`;
}

async function ensureNoOverlap(roomId: string, arrivalDate: Date, departureDate: Date, client?: any) {
  const conflict = await BookingModel.findOne(
    {
      roomId,
      status: ["PENDING", "CONFIRMED", "CHECKED_IN"],
      arrivalDate: arrivalDate,
      departureDate: departureDate,
    },
    client,
  );

  if (conflict) {
    throw new ConflictError("Room is already booked for the selected dates");
  }
}

async function resolveLinkedUser(input: {
  userId?: string;
  guest: {
    fullName: string;
    email: string;
    phone: string;
    identityDocumentUrl: string;
  };
}, client?: any) {
  if (input.userId) {
    const existingById = await UserModel.findById(input.userId, client);
    if (existingById) {
      return existingById;
    }
  }

  const existingByEmail = await UserModel.findOne({ email: input.guest.email }, client);
  if (existingByEmail) {
    return existingByEmail;
  }

  return null;
}

async function upsertGuest(guest: {
  fullName: string;
  email: string;
  phone: string;
  identityDocumentUrl: string;
}, client?: any) {
  const existing = await UserModel.findOne({ email: guest.email }, client);
  if (existing) {
    return existing;
  }

  return UserModel.create({
    email: guest.email,
    name: guest.fullName,
    phone: guest.phone,
    role: "CUSTOMER",
    provider: "local",
    passportDocumentUrl: guest.identityDocumentUrl,
    privacyAcceptedAt: new Date(),
  }, client);
}

export async function createPendingBooking(input: {
  userId?: string;
  roomId: string;
  arrivalDate: Date;
  nights: number;
  pricingPlan: "BED_ONLY" | "BED_BREAKFAST";
  guests: { adults: number; children: number };
  guest: {
    fullName: string;
    email: string;
    phone: string;
    identityDocumentUrl: string;
    privacyAccepted: boolean;
  };
  idempotencyKey: string;
}) {
  if (!input.guest.privacyAccepted) {
    throw new ValidationError("Privacy agreement must be accepted");
  }

  const existingBooking = await BookingModel.findOne({ idempotencyKey: input.idempotencyKey });
  if (existingBooking) {
    return existingBooking;
  }

  const room = await RoomModel.findById(input.roomId);
  if (!room || !room.isActive) {
    throw new NotFoundError("Room not found");
  }

  if (input.guests.adults + input.guests.children > room.capacity) {
    throw new ValidationError("Guest count exceeds room capacity");
  }

  const pricing = await calculateBookingPrice({
    roomId: input.roomId,
    arrivalDate: input.arrivalDate,
    nights: input.nights,
    pricingPlan: input.pricingPlan,
  });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const departureDate = addDays(input.arrivalDate, input.nights);
    await ensureNoOverlap(input.roomId, input.arrivalDate, departureDate, client);

    const reservedRoom = await RoomModel.reserveIfAvailable(input.roomId, client);
    if (!reservedRoom) {
      throw new ConflictError("Room cannot be reserved for this booking");
    }

    const linkedUser = await resolveLinkedUser({ userId: input.userId, guest: input.guest }, client);
    const guestUser = linkedUser ?? (await upsertGuest(input.guest, client));

    const booking = await BookingModel.create({
      bookingRef: createBookingRef(),
      userId: guestUser.id,
      roomId: room.id,
      status: "PENDING" as const,
      pricingPlan: input.pricingPlan,
      guestsAdults: input.guests.adults,
      guestsChildren: input.guests.children,
      arrivalDate: input.arrivalDate,
      nights: input.nights,
      departureDate,
      totalPrice: pricing.total,
      pricingPerNight: pricing.perNight,
      pricingAddons: pricing.addons,
      pricingSubtotal: pricing.subtotal,
      pricingTaxes: pricing.taxes,
      pricingTotal: pricing.total,
      pricingCurrency: pricing.currency,
      guestFullName: input.guest.fullName,
      guestEmail: input.guest.email,
      guestPhone: input.guest.phone,
      guestIdentityDocumentUrl: input.guest.identityDocumentUrl,
      guestPrivacyAcceptedAt: new Date(),
      idempotencyKey: input.idempotencyKey,
    }, client);

    await client.query("COMMIT");
    await syncRoomStatus(input.roomId);
    return booking;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getBookingById(id: string) {
  const booking = await BookingModel.findById(id);
  if (!booking) {
    throw new NotFoundError("Booking not found");
  }

  const payments = await PaymentModel.find({ bookingId: id }, { sort: "created_at DESC" });
  return { ...booking, payments };
}

export async function updateBookingLifecycle(bookingId: string, status: BookingStatus) {
  const booking = await BookingModel.findById(bookingId);
  if (!booking) {
    throw new NotFoundError("Booking not found");
  }

  const updateData: any = { status };

  if (status === "CHECKED_IN") {
    updateData.checkInAt = new Date();
  }

  if (status === "CHECKED_OUT") {
    updateData.checkOutAt = new Date();
  }

  if (status === "CANCELLED") {
    updateData.cancelledAt = new Date();
  }

  const updated = await BookingModel.update(bookingId, updateData);
  await syncRoomStatus(booking.roomId);

  return updated;
}

export async function extendStay(bookingId: string, extraNights: number) {
  if (extraNights < 1) {
    throw new ValidationError("Extension nights must be >= 1");
  }

  const booking = await BookingModel.findById(bookingId);
  if (!booking) {
    throw new NotFoundError("Booking not found");
  }

  const newDepartureDate = addDays(booking.departureDate, extraNights);
  await ensureNoOverlap(booking.roomId, booking.departureDate, newDepartureDate);

  const extraCostPerNight = booking.pricingPerNight + Math.round(booking.pricingPerNight * 0.1);
  const extraSubtotal = extraCostPerNight * extraNights;
  const extraTaxes = Math.round(extraSubtotal * 0.1);
  const overstayCharge = extraSubtotal + extraTaxes;

  const updated = await BookingModel.update(bookingId, {
    nights: booking.nights + extraNights,
    departureDate: newDepartureDate,
    pricingSubtotal: booking.pricingSubtotal + extraSubtotal,
    pricingTaxes: booking.pricingTaxes + extraTaxes,
    pricingTotal: booking.pricingTotal + overstayCharge,
    totalPrice: booking.totalPrice + overstayCharge,
    metadata: {
      ...(booking.metadata ?? {}),
      overstayCharge,
      extraNights,
    },
  });

  return updated;
}

export async function deleteBookingWithDetails(bookingId: string) {
  const booking = await BookingModel.findById(bookingId);
  if (!booking) {
    throw new NotFoundError("Booking not found");
  }

  await PaymentModel.deleteMany({ bookingId });
  await BookingModel.findByIdAndDelete(bookingId);
  await syncRoomStatus(booking.roomId);

  return { deleted: true, bookingId };
}
