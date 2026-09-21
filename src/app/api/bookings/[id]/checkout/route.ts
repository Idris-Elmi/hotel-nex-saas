import { authorize } from "@/lib/auth/rbac";
import { connectDb } from "@/lib/db/mongoose";
import { fail, ok } from "@/lib/http";
import { updateBookingLifecycle } from "@/modules/bookings/services/booking.service";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    authorize(req, ["ADMIN", "RECEPTIONIST"]);
    await connectDb();

    const { id } = await context.params;
    const booking = await updateBookingLifecycle(id, "CHECKED_OUT");
    return ok({ booking });
  } catch (error) {
    return fail(error);
  }
}
