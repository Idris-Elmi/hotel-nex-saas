import { authorize } from "@/lib/auth/rbac";
import { ValidationError } from "@/lib/errors";
import { fail, ok } from "@/lib/http";
import { saveRoomImage } from "@/lib/upload/storage";

export async function POST(req: Request) {
  try {
    authorize(req, ["ADMIN"]);

    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      throw new ValidationError("Missing room image file");
    }

    const url = await saveRoomImage(file);
    return ok({ url }, 201);
  } catch (error) {
    return fail(error);
  }
}
