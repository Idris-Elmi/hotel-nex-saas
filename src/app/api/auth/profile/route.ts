import { authenticateRequest } from "@/lib/auth/rbac";
import { connectDb } from "@/lib/db/mongoose";
import { fail, ok } from "@/lib/http";
import { ValidationError } from "@/lib/errors";
import { UserModel } from "@/models/User";

export async function PUT(req: Request) {
  try {
    const claims = authenticateRequest(req);
    await connectDb();

    const { name, phone, address, gender } = await req.json();

    if (!name || typeof name !== "string" || !name.trim()) {
      throw new ValidationError("Name is required");
    }

    const update: Record<string, unknown> = { name: name.trim() };
    if (phone !== undefined) update.phone = phone;
    if (address !== undefined) update.address = address;
    if (gender !== undefined) update.gender = gender;

    const user = await UserModel.findByIdAndUpdate(
      claims.sub,
      { $set: update },
      { new: true },
    ).select("-passwordHash").lean();

    if (!user) {
      throw new ValidationError("User not found");
    }

    return ok({ user });
  } catch (error) {
    return fail(error);
  }
}
