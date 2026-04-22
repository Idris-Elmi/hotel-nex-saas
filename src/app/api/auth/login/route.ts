import { connectDb } from "@/lib/db/mongoose";
import { fail, ok } from "@/lib/http";
import { ValidationError, AppError } from "@/lib/errors";
import { loginSchema } from "@/lib/validation/auth";
import { loginUser } from "@/modules/auth/services/auth.service";
import { withAuthCookie } from "@/lib/auth/response-cookie";

export async function POST(req: Request) {
  try {
    try {
      await connectDb();
    } catch {
      throw new AppError("Database connection failed. Please check MONGODB_URI and try again.", 503, "database_unavailable");
    }

    const body = await req.json().catch(() => {
      throw new ValidationError("Invalid login payload");
    });

    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Invalid login payload", parsed.error.flatten());
    }

    const result = await loginUser(parsed.data);
    return withAuthCookie(ok(result), result.accessToken);
  } catch (error) {
    return fail(error);
  }
}
