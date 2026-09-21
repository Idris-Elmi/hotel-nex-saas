import { connectDb } from "@/lib/db/mongoose";
import { fail, ok } from "@/lib/http";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { authorize } from "@/lib/auth/rbac";
import { BookingModel } from "@/models/Booking";

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await connectDb();
    const claims = authorize(req, ["CUSTOMER"]);
    const { id } = await context.params;
    const userId = claims.sub;

    const booking = await BookingModel.findById(id);
    if (!booking) {
      throw new NotFoundError("Booking not found");
    }

    if (booking.userId) {
      if (String(booking.userId) === userId) {
        return ok({ booking: booking.toObject() });
      }
      throw new ForbiddenError("Booking is already linked to another user");
    }

    booking.userId = userId as any;
    if (booking.status === "PENDING") {
      booking.status = "awaiting_payment" as any;
    }

    await booking.save();

    return ok({ booking: booking.toObject() });
  } catch (error) {
    return fail(error);
  }
}
