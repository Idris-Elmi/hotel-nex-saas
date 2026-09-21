import { authorize } from "@/lib/auth/rbac";
import { connectDb } from "@/lib/db/mongoose";
import { fail, ok } from "@/lib/http";
import { ValidationError, NotFoundError } from "@/lib/errors";
import { UserModel } from "@/models/User";

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    authorize(req, ["OWNER"]);
    await connectDb();

    const { id } = await context.params;
    const member = await UserModel.findByIdAndDelete(id).lean();

    if (!member) {
      throw new NotFoundError("Staff member not found");
    }

    return ok({ deleted: true });
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    authorize(req, ["OWNER"]);
    await connectDb();

    const { id } = await context.params;
    const body = await req.json();

    const allowed: Record<string, unknown> = {};
    if (body.name !== undefined) allowed.name = body.name;
    if (body.phone !== undefined) allowed.phone = body.phone;
    if (body.isActive !== undefined) allowed.isActive = body.isActive;
    if (body.role !== undefined) {
      if (body.role !== "ADMIN" && body.role !== "RECEPTIONIST") {
        throw new ValidationError("Role must be ADMIN or RECEPTIONIST");
      }
      allowed.role = body.role;
    }

    if (Object.keys(allowed).length === 0) {
      throw new ValidationError("No valid fields to update");
    }

    const user = await UserModel.findByIdAndUpdate(
      id,
      { $set: allowed },
      { new: true },
    ).select("-passwordHash").lean();

    if (!user) {
      throw new ValidationError("Staff member not found");
    }

    return ok({ staff: user });
  } catch (error) {
    return fail(error);
  }
}
