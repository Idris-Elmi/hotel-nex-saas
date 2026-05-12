
import { fail, ok } from "@/lib/http";
import { createBookingSchema } from "@/lib/validation/booking";
import { ValidationError } from "@/lib/errors";
import { createPendingBooking } from "@/modules/bookings/services/booking.service";

export async function POST(req: Request) {
  try {
    

    const parsed = createBookingSchema.safeParse(await req.json());
    if (!parsed.success) {
      throw new ValidationError("Invalid booking payload", parsed.error.flatten());
    }

    const booking = await createPendingBooking({
      userId: parsed.data.userId,
      roomId: parsed.data.roomId,
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
