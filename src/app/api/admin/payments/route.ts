import { authorize } from "@/lib/auth/rbac";
import { connectDb } from "@/lib/db/mongoose";
import { ValidationError } from "@/lib/errors";
import { fail, ok } from "@/lib/http";
import { adminPaymentFilterSchema } from "@/lib/validation/payment";
import { listManualPayments } from "@/modules/payments/services/payment.service";

export async function GET(req: Request) {
  try {
    authorize(req, ["OWNER", "ADMIN"]);
    await connectDb();

    const { searchParams } = new URL(req.url);
    const parsed = adminPaymentFilterSchema.safeParse({
      status: searchParams.get("status") ?? undefined,
    });

    if (!parsed.success) {
      throw new ValidationError("Invalid payment filter", parsed.error.flatten());
    }

    const payments = await listManualPayments(parsed.data.status);
    return ok({ payments });
  } catch (error) {
    return fail(error);
  }
}
