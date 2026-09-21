import bcrypt from "bcryptjs";
import { authorize } from "@/lib/auth/rbac";
import { connectDb } from "@/lib/db/mongoose";
import { fail, ok } from "@/lib/http";
import { ValidationError } from "@/lib/errors";
import { UserModel } from "@/models/User";

export async function GET(req: Request) {
  try {
    authorize(req, ["OWNER"]);
    await connectDb();

    const staff = await UserModel.find(
      { role: { $in: ["ADMIN", "RECEPTIONIST"] } },
      { passwordHash: 0 },
    ).sort({ createdAt: -1 }).lean();

    return ok({ staff });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(req: Request) {
  try {
    authorize(req, ["OWNER"]);
    await connectDb();

    const { name, email, phone, role, password } = await req.json();

    if (!name || !email || !password) {
      throw new ValidationError("Name, email, and password are required");
    }
    if (role !== "ADMIN" && role !== "RECEPTIONIST") {
      throw new ValidationError("Role must be ADMIN or RECEPTIONIST");
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await UserModel.findOne({ email: normalizedEmail });
    if (existing) {
      throw new ValidationError("Email is already registered");
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await UserModel.create({
      name,
      email: normalizedEmail,
      passwordHash,
      role,
      phone,
      provider: "local",
      providerId: normalizedEmail,
    });

    return ok({
      staff: {
        _id: String(user._id),
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
    }, 201);
  } catch (error) {
    return fail(error);
  }
}
