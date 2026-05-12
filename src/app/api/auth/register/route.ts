
import { fail, ok } from "@/lib/http";
import { ValidationError } from "@/lib/errors";
import { registerSchema } from "@/lib/validation/auth";
import { registerUser } from "@/modules/auth/services/auth.service";
import { withAuthCookie } from "@/lib/auth/response-cookie";

export async function POST(req: Request) {
  try {
    

    const body = await req.json().catch(() => {
      throw new ValidationError("Invalid registration payload");
    });

    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Invalid registration payload", parsed.error.flatten());
    }

    const result = await registerUser(parsed.data);
    return withAuthCookie(ok(result, 201), result.accessToken);
  } catch (error) {
    return fail(error);
  }
}
