import { addDays, differenceInCalendarDays, isAfter, startOfDay } from "date-fns";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { BookingModel } from "@/models/booking.model";
import { RoomModel } from "@/models/room.model";
import { createPendingBooking, extendStay as extendBookingStay } from "@/modules/bookings/services/booking.service";
import { addBookingPayment, recalculateBookingPaymentStatus } from "@/modules/payments/services/payment.service";

export async function createWalkInBooking(input: {
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
  return createPendingBooking(input);
}

export async function checkInBooking(bookingId: string) {
  const booking = await BookingModel.findById(bookingId);
  if (!booking) {
    throw new NotFoundError("Booking not found");
  }

  booking.status = "CHECKED_IN";
  booking.checkInAt = new Date();
  await booking.save();

  await RoomModel.findByIdAndUpdate(booking.roomId, { status: "RESERVED" });

  return booking.toObject();
}

export async function checkOutBooking(input: {
  bookingId: string;
  actualCheckOutAt?: Date;
  payment?: {
    amount: number;
    method: "bank" | "mobile_money" | "cash";
  };
}) {
  const booking = await BookingModel.findById(input.bookingId);
  if (!booking) {
    throw new NotFoundError("Booking not found");
  }

  const actualCheckOutAt = input.actualCheckOutAt ?? new Date();
  const plannedCheckOutDate = startOfDay(booking.departureDate);
  const actualCheckOutDate = startOfDay(actualCheckOutAt);

  let overstayCharge = 0;
  let overstayNights = 0;

  if (isAfter(actualCheckOutDate, plannedCheckOutDate)) {
    overstayNights = differenceInCalendarDays(actualCheckOutDate, plannedCheckOutDate);
    const overstaySubtotal = booking.pricing.perNight * overstayNights;
    const overstayTax = Math.round(overstaySubtotal * 0.1);
    overstayCharge = overstaySubtotal + overstayTax;

    booking.nights += overstayNights;
    booking.departureDate = addDays(booking.departureDate, overstayNights);
    booking.pricing.subtotal += overstaySubtotal;
    booking.pricing.taxes += overstayTax;
    booking.pricing.total += overstayCharge;
    booking.totalPrice += overstayCharge;

    booking.metadata = {
      ...(booking.metadata ?? {}),
      overstay: {
        nights: overstayNights,
        charge: overstayCharge,
      },
    };
  }

  booking.status = "CHECKED_OUT";
  booking.checkOutAt = actualCheckOutAt;
  await booking.save();

  if (input.payment) {
    await addBookingPayment({
      bookingId: String(booking._id),
      amount: input.payment.amount,
      method: input.payment.method,
    });
  } else {
    await recalculateBookingPaymentStatus(String(booking._id));
  }

  await RoomModel.findByIdAndUpdate(booking.roomId, { status: "AVAILABLE" });

  return {
    booking: booking.toObject(),
    overstay: {
      nights: overstayNights,
      charge: overstayCharge,
    },
  };
}

export async function extendStay(bookingId: string, extraNights: number) {
  if (extraNights < 1) {
    throw new ValidationError("extraNights must be at least 1");
  }

  const booking = await extendBookingStay(bookingId, extraNights);

  const persisted = await BookingModel.findById(bookingId);
  if (persisted && persisted.status === "CHECKED_IN") {
    await RoomModel.findByIdAndUpdate(persisted.roomId, { status: "RESERVED" });
  }

  return booking;
}
