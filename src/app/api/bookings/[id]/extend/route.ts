import { authorize } from "@/lib/auth/rbac";

import { fail, ok } from "@/lib/http";
import { ValidationError } from "@/lib/errors";
import { extendStay } from "@/modules/bookings/services/booking.service";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    authorize(req, ["ADMIN", "RECEPTIONIST"]);
    

    const { id } = await context.params;
    const payload = await req.json();
    const extraNights = Number(payload.extraNights);
    if (!Number.isInteger(extraNights)) {
      throw new ValidationError("extraNights must be an integer");
    }

    const booking = await extendStay(id, extraNights);
    return ok({ booking });
  } catch (error) {
    return fail(error);
  }
}
