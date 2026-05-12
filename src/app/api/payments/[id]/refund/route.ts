
import { fail, ok } from "@/lib/http";
import { refundPayment } from "@/modules/payments/services/payment.service";

export async function POST(_req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    
    const { id } = await context.params;

    const payment = await refundPayment(id);
    return ok({ payment });
  } catch (error) {
    return fail(error);
  }
}
