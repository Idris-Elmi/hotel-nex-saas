import { authorize } from "@/lib/auth/rbac";

import { ValidationError } from "@/lib/errors";
import { fail, ok } from "@/lib/http";
import { reviewPaymentSchema } from "@/lib/validation/payment";
import { reviewManualPayment } from "@/modules/payments/services/payment.service";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    authorize(req, ["ADMIN"]);
    

    const { id } = await context.params;
    const parsed = reviewPaymentSchema.safeParse(await req.json());
    if (!parsed.success) {
      throw new ValidationError("Invalid payment review payload", parsed.error.flatten());
    }

    const payment = await reviewManualPayment({
      paymentId: id,
      action: parsed.data.action,
      note: parsed.data.note,
    });

    return ok({ payment });
  } catch (error) {
    return fail(error);
  }
}
