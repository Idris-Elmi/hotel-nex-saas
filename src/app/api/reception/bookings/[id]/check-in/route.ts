import { authorize } from "@/lib/auth/rbac";

import { fail, ok } from "@/lib/http";
import { ValidationError } from "@/lib/errors";
import { checkInBooking } from "@/modules/reception/services/operations.service";

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    authorize(_, ["ADMIN", "RECEPTIONIST"]);
    
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
