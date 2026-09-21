import mongoose from "mongoose";
import { authorize } from "@/lib/auth/rbac";
import { connectDb } from "@/lib/db/mongoose";
import { fail, ok } from "@/lib/http";
import { autoCancelExpiredPendingBookings } from "@/modules/bookings/services/booking.service";
import { BookingModel } from "@/models/Booking";
import { PaymentModel } from "@/models/Payment";
import { RoomModel } from "@/models/Room";
import { RoomTypeModel } from "@/models/RoomType";

export async function GET(req: Request) {
  try {
    const claims = authorize(req, ["CUSTOMER"]);
    await connectDb();
    await autoCancelExpiredPendingBookings();

    const filters = [] as Array<Record<string, unknown>>;
    if (mongoose.isValidObjectId(claims.sub)) {
      filters.push({ userId: claims.sub });
    }

    if (claims.email) {
      filters.push({ "guestSnapshot.email": claims.email.toLowerCase() });
    }

    if (filters.length === 0) {
      return ok({ bookings: [] });
    }

    const bookings = await BookingModel.find({ $or: filters })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const bookingIds = bookings.map((booking) => String(booking._id));
    const roomIds = Array.from(new Set(bookings.map((booking) => String(booking.roomId ?? "")))).filter((id) => mongoose.isValidObjectId(id));

    const [rooms, payments] = await Promise.all([
      RoomModel.find({ _id: { $in: roomIds } }, { roomNumber: 1, type: 1, status: 1 }).lean(),
      PaymentModel.find({ bookingId: { $in: bookingIds } })
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    const roomTypeIds = Array.from(new Set(rooms.map((room) => String(room.type ?? "")))).filter((id) => mongoose.isValidObjectId(id));
    const roomTypes = await RoomTypeModel.find({ _id: { $in: roomTypeIds } }, { name: 1, code: 1 }).lean();

    const roomMap = new Map(rooms.map((room) => [String(room._id), room]));
    const roomTypeMap = new Map(roomTypes.map((roomType) => [String(roomType._id), roomType]));
    const latestPaymentMap = new Map<string, (typeof payments)[number]>();
    const paymentHistoryMap = new Map<string, (typeof payments)>();
    for (const payment of payments) {
      const bookingId = String(payment.bookingId ?? "");
      if (!latestPaymentMap.has(bookingId)) {
        latestPaymentMap.set(bookingId, payment);
      }

      const existing = paymentHistoryMap.get(bookingId) ?? [];
      existing.push(payment);
      paymentHistoryMap.set(bookingId, existing);
    }

    const normalized = bookings.map((booking) => {
      const room = roomMap.get(String(booking.roomId ?? ""));
      const roomType = room ? roomTypeMap.get(String(room.type ?? "")) : null;
      const latestPayment = latestPaymentMap.get(String(booking._id));
      const reviewInfo = latestPayment?.rawPayload && typeof latestPayment.rawPayload === "object"
        ? (latestPayment.rawPayload as { review?: { note?: string; reviewedAt?: string } }).review
        : undefined;
      const paymentHistory = (paymentHistoryMap.get(String(booking._id)) ?? []).map((payment) => {
        const paymentReview = payment.rawPayload && typeof payment.rawPayload === "object"
          ? (payment.rawPayload as { review?: { note?: string; reviewedAt?: string } }).review
          : undefined;

        return {
          _id: String(payment._id),
          status: payment.status,
          method: payment.method,
          amount: payment.amount,
          transactionReference: payment.transactionReference,
          receiptUrl: payment.receiptUrl,
          createdAt: payment.createdAt,
          reviewNote: paymentReview?.note,
          reviewedAt: paymentReview?.reviewedAt,
        };
      });

      return {
        _id: String(booking._id),
        bookingRef: booking.bookingRef,
        pricingPlan: booking.pricingPlan,
        guests: booking.guests,
        guestSnapshot: booking.guestSnapshot,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        pricing: booking.pricing,
        totalPrice: booking.totalPrice,
        amountPaid: booking.amountPaid,
        arrivalDate: booking.arrivalDate,
        departureDate: booking.departureDate,
        nights: booking.nights,
        checkInAt: booking.checkInAt,
        checkOutAt: booking.checkOutAt,
        cancelledAt: booking.cancelledAt,
        createdAt: booking.createdAt,
        metadata: booking.metadata,
        room: room
          ? {
              id: String(room._id),
              roomNumber: room.roomNumber,
              status: room.status,
              type: roomType
                ? {
                    id: String(roomType._id),
                    name: roomType.name,
                    code: roomType.code,
                  }
                : null,
            }
          : null,
        latestPayment: latestPayment
          ? {
              _id: String(latestPayment._id),
              status: latestPayment.status,
              method: latestPayment.method,
              amount: latestPayment.amount,
              transactionReference: latestPayment.transactionReference,
              receiptUrl: latestPayment.receiptUrl,
              createdAt: latestPayment.createdAt,
              reviewNote: reviewInfo?.note,
              reviewedAt: reviewInfo?.reviewedAt,
            }
          : null,
        paymentHistory,
      };
    });

    return ok({ bookings: normalized });
  } catch (error) {
    return fail(error);
  }
}
