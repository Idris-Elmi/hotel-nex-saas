import { connectDb } from "@/lib/db/mongoose";
import { fail, ok } from "@/lib/http";
import { optionalAuth } from "@/lib/auth/rbac";
import { autoCancelExpiredPendingBookings, getBookingById } from "@/modules/bookings/services/booking.service";

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await connectDb();
    await autoCancelExpiredPendingBookings();
    const { id } = await context.params;
    const booking = await getBookingById(id);

    const claims = optionalAuth(req);
    if (claims) {
      const isOwner = booking.userId?.toString() === claims.sub;
      const isStaff = ["OWNER", "ADMIN", "RECEPTIONIST"].includes(claims.role);
      const isGuest = !booking.userId && booking.guestSnapshot?.email === claims.email;

      if (!isOwner && !isStaff && !isGuest) {
        return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
      }
    }

    return ok({ booking });
  } catch (error) {
    return fail(error);
  }
}
