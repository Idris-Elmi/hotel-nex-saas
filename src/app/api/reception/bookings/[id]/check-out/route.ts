import { authorize } from "@/lib/auth/rbac";

import { fail, ok } from "@/lib/http";
import { ValidationError } from "@/lib/errors";
import { checkOutSchema } from "@/lib/validation/reception";
import { checkOutBooking } from "@/modules/reception/services/operations.service";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    authorize(req, ["ADMIN", "RECEPTIONIST"]);
    
    const { id } = await context.params;

    if (!isValidObjectId(id)) {
      throw new ValidationError("Invalid booking id");
    }

    const body = await req.json().catch(() => ({}));
    const parsed = checkOutSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Invalid check-out payload", parsed.error.flatten());
    }

    const result = await checkOutBooking({
      bookingId: id,
      actualCheckOutAt: parsed.data.actualCheckOutAt ? new Date(parsed.data.actualCheckOutAt) : undefined,
      payment: parsed.data.payment,
    });

    return ok(result);
  } catch (error) {
    return fail(error);
  }
}
