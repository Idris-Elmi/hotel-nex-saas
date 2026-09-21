import { authorize } from "@/lib/auth/rbac";
import { connectDb } from "@/lib/db/mongoose";
import { fail, ok } from "@/lib/http";
import { updateBookingLifecycle } from "@/modules/bookings/services/booking.service";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    authorize(req, ["OWNER", "ADMIN", "RECEPTIONIST"]);
    await connectDb();
    const { id } = await context.params;
    const booking = await updateBookingLifecycle(id, "CANCELLED");
    return ok({ booking });
  } catch (error) {
    return fail(error);
  }
}
