import { authorize } from "@/lib/auth/rbac";

import { fail, ok } from "@/lib/http";
import { ValidationError } from "@/lib/errors";
import { extendStaySchema } from "@/lib/validation/reception";
import { extendStay } from "@/modules/reception/services/operations.service";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    authorize(req, ["ADMIN", "RECEPTIONIST"]);
    
    const { id } = await context.params;

    if (!isValidObjectId(id)) {
      throw new ValidationError("Invalid booking id");
    }

    const parsed = extendStaySchema.safeParse(await req.json());
    if (!parsed.success) {
      throw new ValidationError("Invalid extend stay payload", parsed.error.flatten());
    }

    const booking = await extendStay(id, parsed.data.extraNights);
    return ok({ booking });
  } catch (error) {
    return fail(error);
  }
}
