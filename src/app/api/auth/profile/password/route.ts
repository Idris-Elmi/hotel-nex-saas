import bcrypt from "bcryptjs";
import { authenticateRequest } from "@/lib/auth/rbac";
import { connectDb } from "@/lib/db/mongoose";
import { fail, ok } from "@/lib/http";
import { ValidationError } from "@/lib/errors";
import { UserModel } from "@/models/User";

export async function PUT(req: Request) {
  try {
    const claims = authenticateRequest(req);
    await connectDb();

    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      throw new ValidationError("Current password and new password are required");
    }

    if (newPassword.length < 8) {
      throw new ValidationError("New password must be at least 8 characters");
    }
    if (!/[a-z]/.test(newPassword)) {
      throw new ValidationError("Password must contain at least one lowercase letter");
    }
    if (!/[A-Z]/.test(newPassword)) {
      throw new ValidationError("Password must contain at least one uppercase letter");
    }
    if (!/[0-9]/.test(newPassword)) {
      throw new ValidationError("Password must contain at least one number");
    }
    if (!/[^a-zA-Z0-9]/.test(newPassword)) {
      throw new ValidationError("Password must contain at least one symbol");
    }

    const user = await UserModel.findById(claims.sub).select("passwordHash").lean();
    if (!user || !user.passwordHash) {
      throw new ValidationError("User not found or no password set");
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      throw new ValidationError("Current password is incorrect");
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await UserModel.findByIdAndUpdate(claims.sub, { $set: { passwordHash } });

    return ok({ message: "Password updated successfully" });
  } catch (error) {
    return fail(error);
  }
}
