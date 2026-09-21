import { authorize } from "@/lib/auth/rbac";
import { connectDb } from "@/lib/db/mongoose";
import { fail, ok } from "@/lib/http";
import { ValidationError } from "@/lib/errors";
import { checkInBooking } from "@/modules/reception/services/operations.service";
import { isValidObjectId } from "mongoose";

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    authorize(_, ["OWNER", "ADMIN", "RECEPTIONIST"]);
    await connectDb();
    const { id } = await context.params;

    if (!isValidObjectId(id)) {
      throw new ValidationError("Invalid booking id");
    }

    const booking = await checkInBooking(id);
    return ok({ booking });
  } catch (error) {
    return fail(error);
  }
}
