import { connectDb } from "@/lib/db/mongoose";
import { fail, ok } from "@/lib/http";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { createBookingSchema } from "@/lib/validation/booking";
import { createPendingBooking } from "@/modules/bookings/services/booking.service";
import { RoomModel } from "@/models/Room";
import mongoose from "mongoose";

export async function POST(req: Request) {
  try {
    await connectDb();

    const parsed = createBookingSchema.safeParse(await req.json());
    if (!parsed.success) {
      throw new ValidationError("Invalid booking payload", parsed.error.flatten());
    }

    let room;
    if (parsed.data.roomId && mongoose.isValidObjectId(parsed.data.roomId)) {
      room = await RoomModel.findById(parsed.data.roomId);
    }
    if (!room) {
      const roomNumber = parsed.data.roomNumber ?? (parsed.data.roomId && !mongoose.isValidObjectId(parsed.data.roomId) ? parsed.data.roomId : undefined);
      if (roomNumber) {
        room = await RoomModel.findOne({ roomNumber });
      }
    }
    if (!room) {
      throw new NotFoundError(`Room not found`);
    }

    const booking = await createPendingBooking({
      userId: parsed.data.userId,
      roomId: String(room._id),
      arrivalDate: new Date(parsed.data.arrivalDate),
      nights: parsed.data.nights,
      guests: parsed.data.guests,
      pricingPlan: parsed.data.pricingPlan,
      guest: parsed.data.guest,
      idempotencyKey: parsed.data.idempotencyKey,
    });

    return ok({ booking }, 201);
  } catch (error) {
    return fail(error);
  }
}
