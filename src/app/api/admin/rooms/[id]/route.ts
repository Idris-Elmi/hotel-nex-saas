import { authorize } from "@/lib/auth/rbac";
import { connectDb } from "@/lib/db/mongoose";
import { fail, ok } from "@/lib/http";
import mongoose from "mongoose";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { updateRoomSchema } from "@/lib/validation/room";
import { RoomModel } from "@/models/Room";
import { RoomTypeModel } from "@/models/RoomType";

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    authorize(req, ["OWNER", "ADMIN"]);
    await connectDb();
    const { id } = await context.params;
    const room = await RoomModel.findById(id).populate("type").lean();
    return ok({ room });
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    authorize(req, ["OWNER", "ADMIN"]);
    await connectDb();

    const { id } = await context.params;
    const parsed = updateRoomSchema.safeParse(await req.json());
    if (!parsed.success) {
      throw new ValidationError("Invalid room update payload", parsed.error.flatten());
    }

    if (parsed.data.type) {
      const roomType = await RoomTypeModel.findById(parsed.data.type).lean();
      if (!roomType) {
        throw new ValidationError("Invalid room type reference");
      }
    }

    const room = await RoomModel.findByIdAndUpdate(id, parsed.data, { new: true }).populate("type");
    return ok({ room });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    authorize(req, ["OWNER", "ADMIN"]);
    await connectDb();
    const { id } = await context.params;

    if (!mongoose.isValidObjectId(id)) {
      throw new ValidationError("Invalid room id");
    }

    const deleted = await RoomModel.findByIdAndDelete(id);
    if (!deleted) {
      throw new NotFoundError("Room not found");
    }

    return ok({ deleted: true });
  } catch (error) {
    return fail(error);
  }
}
