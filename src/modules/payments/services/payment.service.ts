import mongoose from "mongoose";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { BookingModel } from "@/models/Booking";
import { PaymentModel } from "@/models/Payment";
import { RoomModel } from "@/models/Room";
import { syncRoomStatus } from "@/modules/rooms/services/room-status.service";
import type { PaymentStatus } from "@/models/enums";

function calculateBookingPaymentState(totalPrice: number, payments: Array<{ amount: number; status: PaymentStatus }>) {
  const collected = payments
    .filter((payment) => payment.status === "APPROVED" || payment.status === "PAID" || payment.status === "PARTIAL")
    .reduce((sum, payment) => sum + payment.amount, 0);

  const refunded = payments
    .filter((payment) => payment.status === "REFUNDED")
    .reduce((sum, payment) => sum + payment.amount, 0);

  const netPaid = Math.max(collected - refunded, 0);
  const rejectedCount = payments.filter((payment) => payment.status === "REJECTED").length;

  let paymentStatus: "PENDING" | "PARTIAL" | "PAID" | "REFUNDED" | "REJECTED" = "PENDING";
  if (netPaid >= totalPrice && totalPrice > 0) {
    paymentStatus = "PAID";
  } else if (netPaid > 0) {
    paymentStatus = "PARTIAL";
  } else if (refunded > 0) {
    paymentStatus = "REFUNDED";
  } else if (rejectedCount > 0) {
    paymentStatus = "REJECTED";
  }

  return { amountPaid: netPaid, paymentStatus };
}

export async function recalculateBookingPaymentStatus(bookingId: string, session?: mongoose.ClientSession) {
  const booking = await BookingModel.findById(bookingId, null, session ? { session } : undefined);
  if (!booking) {
    throw new NotFoundError("Booking not found");
  }

  const payments = await PaymentModel.find(
    { bookingId: booking._id },
    { amount: 1, status: 1 },
    session ? { session } : undefined,
  ).lean();

  const { amountPaid, paymentStatus } = calculateBookingPaymentState(booking.totalPrice, payments as Array<{ amount: number; status: PaymentStatus }>);

  booking.amountPaid = amountPaid;
  booking.paymentStatus = paymentStatus;

  if (paymentStatus === "PAID" && booking.status === "PENDING") {
    booking.status = "CONFIRMED";
  }

  await booking.save(session ? { session } : undefined);
  return booking;
}

export async function listBookingPayments(bookingId: string) {
  return PaymentModel.find({ bookingId }).sort({ createdAt: -1 }).lean();
}

export async function addBookingPayment(input: {
  bookingId: string;
  bookingRef?: string;
  amount: number;
  method: "bank" | "mobile_money" | "cash" | "transfer" | "upload";
  status?: PaymentStatus;
  transactionReference?: string;
  idempotencyKey?: string;
  receiptUrl?: string;
  rawPayload?: unknown;
}) {
  if (input.amount <= 0) {
    throw new ValidationError("Payment amount must be greater than zero");
  }

  if (input.method !== "cash" && !input.transactionReference && !input.receiptUrl) {
    throw new ValidationError("Provide receipt or transaction reference");
  }

  const booking = await BookingModel.findById(input.bookingId);
  if (!booking) {
    throw new NotFoundError("Booking not found");
  }

  if (input.bookingRef && booking.bookingRef !== input.bookingRef) {
    throw new ValidationError("Booking reference does not match booking ID");
  }

  const remainingDue = Math.max(booking.totalPrice - booking.amountPaid, 0);
  const paidInFull = remainingDue > 0 && input.amount >= remainingDue;
  const computedStatus = input.status ?? (input.method === "cash" ? (paidInFull ? "PAID" : "PARTIAL") : "PENDING");

  // Duplicate payment guard — prevent same booking from being charged twice
  const existingPayment = await PaymentModel.findOne({
    bookingId: booking._id,
    status: { $nin: ["FAILED", "REJECTED"] },
    method: input.method,
  }).lean();

  if (existingPayment) {
    return existingPayment;
  }

  const payment = await PaymentModel.create({
    bookingId: booking._id,
    userId: booking.userId,
    amount: input.amount,
    status: computedStatus,
    method: input.method,
    transactionReference: input.transactionReference,
    idempotencyKey: input.idempotencyKey,
    receiptUrl: input.receiptUrl,
    rawPayload: input.rawPayload,
  });

  if (computedStatus === "APPROVED" || computedStatus === "PAID" || computedStatus === "PARTIAL" || computedStatus === "REFUNDED") {
    await recalculateBookingPaymentStatus(String(booking._id));
    await syncRoomStatus(String(booking.roomId));
  }

  return payment.toObject();
}

export async function listManualPayments(status?: "PENDING" | "APPROVED" | "REJECTED") {
  const query = status ? { status } : { status: { $in: ["PENDING", "APPROVED", "REJECTED"] } };
  const payments = await PaymentModel.find(query).sort({ createdAt: -1 }).lean();

  const bookingIds = Array.from(new Set(payments.map((payment) => String(payment.bookingId ?? ""))));
  const bookings = await BookingModel.find({ _id: { $in: bookingIds } }, {
    bookingRef: 1,
    roomId: 1,
    guestSnapshot: 1,
    arrivalDate: 1,
    departureDate: 1,
    totalPrice: 1,
    status: 1,
  }).lean();

  const roomIds = Array.from(new Set(bookings.map((booking) => String(booking.roomId ?? ""))));
  const rooms = await RoomModel.find({ _id: { $in: roomIds } }, { roomNumber: 1 }).lean();

  const bookingMap = new Map(bookings.map((booking) => [String(booking._id), booking]));
  const roomMap = new Map(rooms.map((room) => [String(room._id), room]));

  return payments.map((payment) => {
    const booking = bookingMap.get(String(payment.bookingId ?? ""));
    const room = booking ? roomMap.get(String(booking.roomId ?? "")) : null;

    return {
      ...payment,
      booking: booking
        ? {
            id: String(booking._id),
            bookingRef: booking.bookingRef,
            arrivalDate: booking.arrivalDate,
            departureDate: booking.departureDate,
            totalPrice: booking.totalPrice,
            status: booking.status,
            guest: booking.guestSnapshot,
            room: {
              id: String(booking.roomId),
              roomNumber: room?.roomNumber ?? "N/A",
            },
          }
        : null,
    };
  });
}

export async function reviewManualPayment(input: { paymentId: string; action: "approve" | "reject"; note?: string }) {
  const payment = await PaymentModel.findById(input.paymentId);
  if (!payment) {
    throw new NotFoundError("Payment not found");
  }

  if (payment.status !== "PENDING") {
    throw new ConflictError("Only pending payments can be reviewed");
  }

  payment.status = input.action === "approve" ? "APPROVED" : "REJECTED";
  payment.rawPayload = {
    ...(typeof payment.rawPayload === "object" && payment.rawPayload ? payment.rawPayload : {}),
    review: {
      action: input.action,
      note: input.note ?? "",
      reviewedAt: new Date().toISOString(),
    },
  };
  await payment.save();

  const booking = await BookingModel.findById(payment.bookingId);
  if (!booking) {
    throw new NotFoundError("Booking not found for payment");
  }

  if (payment.status === "APPROVED") {
    const remainingDue = Math.max(booking.totalPrice - booking.amountPaid, 0);
    if (remainingDue > 0 && payment.amount >= remainingDue) {
      payment.status = "PAID";
      await payment.save();
    } else if (payment.amount > 0) {
      payment.status = "PARTIAL";
      await payment.save();
    }
  }

  await recalculateBookingPaymentStatus(String(booking._id));
  await syncRoomStatus(String(booking.roomId));

  return payment.toObject();
}

export async function refundPayment(paymentId: string) {
  const payment = await PaymentModel.findById(paymentId);
  if (!payment) {
    throw new NotFoundError("Payment not found");
  }

  payment.status = "REFUNDED";
  await payment.save();

  await recalculateBookingPaymentStatus(String(payment.bookingId));
  const booking = await BookingModel.findById(payment.bookingId).lean();
  if (booking) {
    await syncRoomStatus(String(booking.roomId));
  }

  return payment.toObject();
}

export async function createPaymentIntent(input: { bookingId: string; idempotencyKey: string }) {
  void input;
  throw new ValidationError("Online gateway payment is disabled. Use manual payment submission.");
}

export async function handleManualWebhook(rawBody: string, signature: string) {
  void rawBody;
  void signature;
  throw new ValidationError("Webhook endpoint is disabled in manual payment mode");
}
