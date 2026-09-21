import mongoose from "mongoose";
import { authorize } from "@/lib/auth/rbac";
import { chapaInitialize } from "@/lib/chapa";
import { connectDb } from "@/lib/db/mongoose";
import { AppError, ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { fail, ok } from "@/lib/http";
import { autoCancelExpiredPendingBookings } from "@/modules/bookings/services/booking.service";
import { BookingModel } from "@/models/Booking";
import { PaymentModel } from "@/models/Payment";

export async function POST(req: Request) {
  try {
    const claims = authorize(req, ["CUSTOMER"]);
    try {
      await connectDb();
    } catch {
      throw new AppError("Database connection failed. Please check MONGODB_URI and try again.", 503, "database_unavailable");
    }
    await autoCancelExpiredPendingBookings();

    const body = (await req.json().catch(() => ({}))) as { bookingId?: string };
    const bookingId = body.bookingId?.trim() ?? "";
    if (!bookingId || !mongoose.isValidObjectId(bookingId)) {
      throw new ValidationError("bookingId required");
    }

    const booking = await BookingModel.findById(bookingId).lean();
    if (!booking) {
      throw new NotFoundError("Booking not found");
    }

    if (booking.status === "CANCELLED") {
      throw new ConflictError("This booking was cancelled because it was not paid within 30 minutes. Please create a new booking.");
    }

    const ownsBooking =
      (booking.userId && String(booking.userId) === claims.sub) ||
      (booking.guestSnapshot?.email?.toLowerCase() === claims.email?.toLowerCase());
    if (!ownsBooking) {
      throw new ForbiddenError("Forbidden");
    }

    if (booking.paymentStatus === "PAID") {
      throw new ConflictError("Already paid");
    }

    const tx_ref = `aurora-${bookingId}-${Date.now()}`;

    await PaymentModel.create({
      bookingId: booking._id,
      userId: booking.userId ?? claims.sub,
      amount: booking.totalPrice,
      method: "transfer",
      status: "PENDING",
      transactionReference: tx_ref,
      rawPayload: {
        provider: "chapa",
        source: "gateway",
        bookingRef: booking.bookingRef ?? "",
      },
    });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
    const guestName = booking.guestSnapshot?.fullName?.trim() ?? "";
    const guestNameParts = guestName.split(/\s+/);

    const { checkout_url } = await chapaInitialize({
      amount: booking.totalPrice,
      currency: booking.pricing?.currency ?? "ETB",
      email: booking.guestSnapshot?.email ?? claims.email,
      first_name: guestNameParts[0] || "Guest",
      last_name: guestNameParts.slice(1).join(" "),
      phone_number: booking.guestSnapshot?.phone,
      tx_ref,
      return_url: `${baseUrl}/payment/success?tx_ref=${encodeURIComponent(tx_ref)}`,
      customization: {
        title: "Aurora Stays",
        description: `Booking ref ${booking.bookingRef ?? bookingId}`,
      },
      meta: {
        bookingId: String(booking._id),
        bookingRef: booking.bookingRef ?? "",
      },
    });

    return ok({ checkout_url, tx_ref });
  } catch (error) {
    return fail(error);
  }
}
