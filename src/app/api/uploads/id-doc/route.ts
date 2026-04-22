import { fail, ok } from "@/lib/http";
import { saveIdentityDocument } from "@/lib/upload/storage";
import { ValidationError } from "@/lib/errors";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      throw new ValidationError("Missing file");
    }

    const url = await saveIdentityDocument(file);
    return ok({ url }, 201);
  } catch (error) {
    return fail(error);
  }
}
