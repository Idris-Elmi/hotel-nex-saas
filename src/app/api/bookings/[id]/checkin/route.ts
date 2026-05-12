import { authorize } from "@/lib/auth/rbac";

import { fail, ok } from "@/lib/http";
import { updateBookingLifecycle } from "@/modules/bookings/services/booking.service";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    authorize(req, ["ADMIN", "RECEPTIONIST"]);
    

    const { id } = await context.params;
    const booking = await updateBookingLifecycle(id, "CHECKED_IN");
    return ok({ booking });
  } catch (error) {
    return fail(error);
  }
}
