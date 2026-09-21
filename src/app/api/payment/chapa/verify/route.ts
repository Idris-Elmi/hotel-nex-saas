import { optionalAuth } from "@/lib/auth/rbac";
import { chapaVerify } from "@/lib/chapa";
import { connectDb } from "@/lib/db/mongoose";
import { AppError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { fail, ok } from "@/lib/http";
import { BookingModel } from "@/models/Booking";
import { PaymentModel } from "@/models/Payment";
import { recalculateBookingPaymentStatus } from "@/modules/payments/services/payment.service";
import { syncRoomStatus } from "@/modules/rooms/services/room-status.service";

export async function GET(req: Request) {
  try {
    const claims = optionalAuth(req);
    try {
      await connectDb();
    } catch {
      throw new AppError("Database connection failed. Please check MONGODB_URI and try again.", 503, "database_unavailable");
    }

    const { searchParams } = new URL(req.url);
    const tx_ref = searchParams.get("tx_ref")?.trim() ?? "";
    if (!tx_ref) {
      throw new ValidationError("tx_ref required");
    }

    const payment = await PaymentModel.findOne({ transactionReference: tx_ref }).lean();
    if (!payment) {
      throw new NotFoundError("Payment not found");
    }

    const booking = await BookingModel.findById(payment.bookingId).lean();
    if (!booking) {
      throw new NotFoundError("Booking not found");
    }

    if (claims) {
      const ownsBooking =
        (booking.userId && String(booking.userId) === claims.sub) ||
        (booking.guestSnapshot?.email?.toLowerCase() === claims.email?.toLowerCase());
      if (!ownsBooking) {
        throw new ForbiddenError("Forbidden");
      }
    }

    if (payment.status === "PAID" || payment.status === "APPROVED") {
      return ok({ status: payment.status, bookingId: String(booking._id), alreadyProcessed: true });
    }

    const verified = await chapaVerify(tx_ref);

    if (verified.status === "success") {
      await PaymentModel.findByIdAndUpdate(payment._id, {
        status: "PAID",
        rawPayload: {
          ...(typeof payment.rawPayload === "object" && payment.rawPayload ? payment.rawPayload : {}),
          chapa: verified,
          verifiedAt: new Date().toISOString(),
        },
      });

      await recalculateBookingPaymentStatus(String(booking._id));
      await syncRoomStatus(String(booking.roomId));

      return ok({ status: "PAID", bookingId: String(booking._id) });
    }

    if (verified.status === "failed") {
      await PaymentModel.findByIdAndUpdate(payment._id, { status: "REJECTED" });
      return ok({ status: "REJECTED", bookingId: String(booking._id) });
    }

    return ok({ status: "PENDING", bookingId: String(booking._id) });
  } catch (error) {
    return fail(error);
  }
}
