import crypto from "crypto";
import { connectDb } from "@/lib/db/mongoose";
import { fail, ok } from "@/lib/http";
import { AppError, ValidationError } from "@/lib/errors";
import { forgotPasswordSchema } from "@/lib/validation/auth";
import { UserModel } from "@/models/User";

const RESET_TOKEN_TTL_MS = 1000 * 60 * 60;

function buildResetUrl(token: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.trim() ?? "";
  const path = `/auth/reset-password?token=${token}`;
  return baseUrl ? `${baseUrl}${path}` : path;
}

export async function POST(req: Request) {
  try {
    try {
      await connectDb();
    } catch {
      throw new AppError("Database connection failed. Please check MONGODB_URI and try again.", 503, "database_unavailable");
    }

    const body = await req.json().catch(() => {
      throw new ValidationError("Invalid payload");
    });

    const parsed = forgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Invalid payload", parsed.error.flatten());
    }

    const email = parsed.data.email.trim().toLowerCase();

    const user = await UserModel.findOne({ email });
    const isLocalCustomer = user && typeof user.passwordHash === "string" && user.passwordHash.trim().length > 0;

    if (isLocalCustomer && user) {
      const token = crypto.randomBytes(32).toString("hex");
      user.resetPasswordToken = token;
      user.resetPasswordExpires = new Date(Date.now() + RESET_TOKEN_TTL_MS);
      await user.save();

      const isProduction = process.env.NODE_ENV === "production";
      return ok({
        message: "If an account exists for this email, a password reset link has been sent.",
        ...(isProduction ? {} : { resetUrl: buildResetUrl(token) }),
      });
    }

    return ok({
      message: "If an account exists for this email, a password reset link has been sent.",
    });
  } catch (error) {
    return fail(error);
  }
}
