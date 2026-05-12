import { authorize } from "@/lib/auth/rbac";

import { fail, ok } from "@/lib/http";
import { deleteBookingWithDetails, getBookingById } from "@/modules/bookings/services/booking.service";

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    authorize(req, ["ADMIN", "RECEPTIONIST"]);
    

    const { id } = await context.params;
    const booking = await getBookingById(id);
    return ok({ booking });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    authorize(req, ["ADMIN"]);
    

    const { id } = await context.params;
    const result = await deleteBookingWithDetails(id);
    return ok(result);
  } catch (error) {
    return fail(error);
  }
}
