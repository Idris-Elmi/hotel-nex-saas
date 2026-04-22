import { randomUUID } from "crypto";
import mongoose from "mongoose";
import { addDays } from "date-fns";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { BookingModel } from "@/models/Booking";
import { PaymentModel } from "@/models/Payment";
import { RoomModel } from "@/models/Room";
import { UserModel } from "@/models/User";
import { calculateBookingPrice } from "@/modules/rooms/services/pricing.service";
import { syncRoomStatus } from "@/modules/rooms/services/room-status.service";
import type { BookingStatus } from "@/models/enums";

function createBookingRef(): string {
  const stamp = Date.now().toString().slice(-8);
  return `BK-${stamp}-${randomUUID().slice(0, 6).toUpperCase()}`;
}

function isTransactionNotSupportedError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("transaction numbers are only allowed") ||
    message.includes("replica set") ||
    message.includes("does not support transactions")
  );
}

async function ensureNoOverlap(roomId: string, arrivalDate: Date, departureDate: Date, session?: mongoose.ClientSession) {
  const conflict = await BookingModel.findOne(
    {
      roomId,
      status: { $in: ["PENDING", "CONFIRMED", "CHECKED_IN"] },
      arrivalDate: { $lt: departureDate },
      departureDate: { $gt: arrivalDate },
    },
    null,
    { session },
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
}) {
  if (input.userId) {
    const existingById = await UserModel.findById(input.userId);
    if (existingById) {
      return existingById;
    }
  }

  const existingByEmail = await UserModel.findOne({ email: input.guest.email });
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
}) {
  const existing = await UserModel.findOne({ email: guest.email });
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
  });
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

  const existingBooking = await BookingModel.findOne({ "metadata.idempotencyKey": input.idempotencyKey }).lean();
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

  async function persistPendingBooking(session?: mongoose.ClientSession) {
    const departureDate = addDays(input.arrivalDate, input.nights);
    await ensureNoOverlap(input.roomId, input.arrivalDate, departureDate, session);

    const reservedRoom = await RoomModel.findOneAndUpdate(
      { _id: input.roomId, isActive: true, status: "AVAILABLE" },
      { status: "RESERVED" },
      session ? { new: true, session } : { new: true },
    );

    if (!reservedRoom) {
      throw new ConflictError("Room cannot be reserved for this booking");
    }

    const linkedUser = await resolveLinkedUser({ userId: input.userId, guest: input.guest });
    const guestUser = linkedUser ?? (await upsertGuest(input.guest));

    const createPayload = {
      bookingRef: createBookingRef(),
      userId: guestUser._id,
      roomId: room._id,
      status: "PENDING" as const,
      pricingPlan: input.pricingPlan,
      guests: input.guests,
      arrivalDate: input.arrivalDate,
      nights: input.nights,
      departureDate,
      totalPrice: pricing.total,
      pricing,
      guestSnapshot: {
        fullName: input.guest.fullName,
        email: input.guest.email,
        phone: input.guest.phone,
        identityDocumentUrl: input.guest.identityDocumentUrl,
        privacyAcceptedAt: new Date(),
      },
      metadata: {
        idempotencyKey: input.idempotencyKey,
      },
    };

    if (session) {
      const [booking] = await BookingModel.create([createPayload], { session });
      return String(booking._id);
    }

    const booking = await BookingModel.create(createPayload);
    return String(booking._id);
  }

  const session = await mongoose.startSession();

  try {
    let bookingId = "";

    try {
      await session.withTransaction(async () => {
        bookingId = await persistPendingBooking(session);
      });
    } catch (error) {
      if (!isTransactionNotSupportedError(error)) {
        throw error;
      }

      bookingId = await persistPendingBooking();
    }

    await syncRoomStatus(input.roomId);

    const booking = await BookingModel.findById(bookingId).lean();
    return booking;
  } finally {
    await session.endSession();
  }
}

export async function getBookingById(id: string) {
  const booking = await BookingModel.findById(id).lean();
  if (!booking) {
    throw new NotFoundError("Booking not found");
  }

  const payments = await PaymentModel.find({ bookingId: booking._id }).sort({ createdAt: -1 }).lean();
  return { ...booking, payments };
}

export async function updateBookingLifecycle(bookingId: string, status: BookingStatus) {
  const booking = await BookingModel.findById(bookingId);
  if (!booking) {
    throw new NotFoundError("Booking not found");
  }

  if (status === "CHECKED_IN") {
    booking.checkInAt = new Date();
  }

  if (status === "CHECKED_OUT") {
    booking.checkOutAt = new Date();
  }

  if (status === "CANCELLED") {
    booking.cancelledAt = new Date();
  }

  booking.status = status;
  await booking.save();
  await syncRoomStatus(String(booking.roomId));

  return booking.toObject();
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
  await ensureNoOverlap(String(booking.roomId), booking.departureDate, newDepartureDate);

  const extraCostPerNight = booking.pricing.perNight + Math.round(booking.pricing.perNight * 0.1);
  const extraSubtotal = extraCostPerNight * extraNights;
  const extraTaxes = Math.round(extraSubtotal * 0.1);
  const overstayCharge = extraSubtotal + extraTaxes;

  booking.nights += extraNights;
  booking.departureDate = newDepartureDate;
  booking.pricing.subtotal += extraSubtotal;
  booking.pricing.taxes += extraTaxes;
  booking.pricing.total += overstayCharge;
  booking.totalPrice += overstayCharge;
  booking.metadata = {
    ...(booking.metadata ?? {}),
    overstayCharge,
    extraNights,
  };

  await booking.save();

  return booking.toObject();
}

export async function deleteBookingWithDetails(bookingId: string) {
  const booking = await BookingModel.findById(bookingId).lean();
  if (!booking) {
    throw new NotFoundError("Booking not found");
  }

  await PaymentModel.deleteMany({ bookingId: booking._id });
  await BookingModel.findByIdAndDelete(bookingId);
  await syncRoomStatus(String(booking.roomId));

  return { deleted: true, bookingId };
}
