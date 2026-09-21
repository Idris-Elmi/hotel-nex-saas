import bcrypt from "bcryptjs";
import { connectDb } from "@/lib/db/mongoose";
import { fail, ok } from "@/lib/http";
import { AppError, ValidationError } from "@/lib/errors";
import { resetPasswordSchema } from "@/lib/validation/auth";
import { UserModel } from "@/models/User";

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

    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Invalid payload", parsed.error.flatten());
    }

    const { token, password } = parsed.data;

    const user = await UserModel.findOne({ resetPasswordToken: token });
    if (!user) {
      throw new ValidationError("Invalid or expired reset token.");
    }

    if (!user.resetPasswordExpires || user.resetPasswordExpires.getTime() <= Date.now()) {
      throw new ValidationError("Invalid or expired reset token.");
    }

    const passwordHash = await bcrypt.hash(password, 12);

    user.passwordHash = passwordHash;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return ok({ message: "Password reset successfully." });
  } catch (error) {
    return fail(error);
  }
}
