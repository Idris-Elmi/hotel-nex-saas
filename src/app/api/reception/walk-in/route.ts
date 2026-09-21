import { authorize } from "@/lib/auth/rbac";
import { connectDb } from "@/lib/db/mongoose";
import { fail, ok } from "@/lib/http";
import { ValidationError } from "@/lib/errors";
import { walkInBookingSchema } from "@/lib/validation/reception";
import { createWalkInBooking } from "@/modules/reception/services/operations.service";
import { isValidObjectId } from "mongoose";
import { RoomModel } from "@/models/Room";

export async function POST(req: Request) {
  try {
    authorize(req, ["ADMIN", "RECEPTIONIST"]);
    await connectDb();

    const body = await req.json().catch(() => {
      throw new ValidationError("Invalid walk-in booking payload");
    });

    const parsed = walkInBookingSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Invalid walk-in booking payload", parsed.error.flatten());
    }

    let resolvedRoomId = parsed.data.roomId;
    if (!isValidObjectId(parsed.data.roomId)) {
      const room = await RoomModel.findOne({ roomNumber: parsed.data.roomId }).select("_id").lean();
      if (!room) {
        throw new ValidationError("Invalid room number. Provide an existing room number, for example 101.");
      }
      resolvedRoomId = String(room._id);
    }

    if (parsed.data.userId && !isValidObjectId(parsed.data.userId)) {
      throw new ValidationError("Invalid user id.");
    }

    const booking = await createWalkInBooking({
      userId: parsed.data.userId,
      roomId: resolvedRoomId,
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
