import { authorize } from "@/lib/auth/rbac";
import { connectDb } from "@/lib/db/mongoose";
import { fail, ok } from "@/lib/http";
import { ValidationError } from "@/lib/errors";
import { deleteBookingWithDetails, getBookingById, updateBookingLifecycle } from "@/modules/bookings/services/booking.service";
import { BookingStatusValues } from "@/models/enums";

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    authorize(req, ["OWNER", "ADMIN"]);
    await connectDb();

    const { id } = await context.params;
    const booking = await getBookingById(id);
    return ok({ booking });
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    authorize(req, ["OWNER", "ADMIN"]);
    await connectDb();

    const { id } = await context.params;
    const body = await req.json();
    const { status } = body;

    if (!status || !BookingStatusValues.includes(status)) {
      throw new ValidationError("Invalid booking status");
    }

    const booking = await updateBookingLifecycle(id, status);
    return ok({ booking });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    authorize(req, ["OWNER", "ADMIN"]);
    await connectDb();

    const { id } = await context.params;
    const result = await deleteBookingWithDetails(id);
    return ok(result);
  } catch (error) {
    return fail(error);
  }
}
