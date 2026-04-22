import { ValidationError } from "@/lib/errors";
import { fail, ok } from "@/lib/http";
import { savePaymentReceipt } from "@/lib/upload/storage";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      throw new ValidationError("Missing receipt file");
    }

    const url = await savePaymentReceipt(file);
    return ok({ url }, 201);
  } catch (error) {
    return fail(error);
  }
}
