import { connectDb } from "@/lib/db/mongoose";
import { ValidationError } from "@/lib/errors";
import { fail, ok } from "@/lib/http";
import { createPaymentSchema, listPaymentsQuerySchema } from "@/lib/validation/payment";
import { addBookingPayment, listBookingPayments } from "@/modules/payments/services/payment.service";

export async function GET(req: Request) {
  try {
    await connectDb();

    const { searchParams } = new URL(req.url);
    const parsed = listPaymentsQuerySchema.safeParse({ bookingId: searchParams.get("bookingId") ?? "" });
    if (!parsed.success) {
      throw new ValidationError("Invalid payment query", parsed.error.flatten());
    }

    const payments = await listBookingPayments(parsed.data.bookingId);
    return ok({ payments });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(req: Request) {
  try {
    await connectDb();

    const parsed = createPaymentSchema.safeParse(await req.json());
    if (!parsed.success) {
      throw new ValidationError("Invalid payment payload", parsed.error.flatten());
    }

    const payment = await addBookingPayment(parsed.data);
    return ok({ payment }, 201);
  } catch (error) {
    return fail(error);
  }
}
