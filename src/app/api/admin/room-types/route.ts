import { authorize } from "@/lib/auth/rbac";
import { connectDb } from "@/lib/db/mongoose";
import { fail, ok } from "@/lib/http";
import { ValidationError } from "@/lib/errors";
import { createRoomTypeSchema } from "@/lib/validation/room";
import { RoomTypeModel } from "@/models/RoomType";

export async function GET(req: Request) {
  try {
    authorize(req, ["ADMIN"]);
    await connectDb();
    const types = await RoomTypeModel.find().sort({ name: 1 }).lean();
    return ok({ types });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(req: Request) {
  try {
    authorize(req, ["ADMIN"]);
    await connectDb();

    const parsed = createRoomTypeSchema.safeParse(await req.json());
    if (!parsed.success) {
      throw new ValidationError("Invalid room type payload", parsed.error.flatten());
    }

    const type = await RoomTypeModel.create({
      ...parsed.data,
      code: parsed.data.code.toUpperCase(),
    });

    return ok({ type }, 201);
  } catch (error) {
    return fail(error);
  }
}
