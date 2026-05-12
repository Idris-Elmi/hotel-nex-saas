
import { fail, ok } from "@/lib/http";
import { getBookingById } from "@/modules/bookings/services/booking.service";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    
    const { id } = await context.params;
    const booking = await getBookingById(id);
    return ok({ booking });
  } catch (error) {
    return fail(error);
  }
}
