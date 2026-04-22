import { authorize } from "@/lib/auth/rbac";
import { connectDb } from "@/lib/db/mongoose";
import { fail, ok } from "@/lib/http";
import { ValidationError } from "@/lib/errors";
import { updateRoomTypeSchema } from "@/lib/validation/room";
import { RoomTypeModel } from "@/models/RoomType";

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    authorize(req, ["ADMIN"]);
    await connectDb();

    const { id } = await context.params;
    const parsed = updateRoomTypeSchema.safeParse(await req.json());
    if (!parsed.success) {
      throw new ValidationError("Invalid room type update payload", parsed.error.flatten());
    }

    const payload = parsed.data.code ? { ...parsed.data, code: parsed.data.code.toUpperCase() } : parsed.data;
    const type = await RoomTypeModel.findByIdAndUpdate(id, payload, { new: true });
    return ok({ type });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    authorize(req, ["ADMIN"]);
    await connectDb();
    const { id } = await context.params;
    await RoomTypeModel.findByIdAndDelete(id);
    return ok({ deleted: true });
  } catch (error) {
    return fail(error);
  }
}
