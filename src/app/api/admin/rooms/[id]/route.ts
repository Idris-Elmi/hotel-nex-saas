import { authorize } from "@/lib/auth/rbac";

import { fail, ok } from "@/lib/http";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { updateRoomSchema } from "@/lib/validation/room";
import { RoomModel } from "@/models/room.model";
import { RoomTypeModel } from "@/models/room-type.model";

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    authorize(req, ["ADMIN"]);
    
    const { id } = await context.params;
    const room = await RoomModel.findById(id);
    return ok({ room });
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    authorize(req, ["ADMIN"]);
    

    const { id } = await context.params;
    const parsed = updateRoomSchema.safeParse(await req.json());
    if (!parsed.success) {
      throw new ValidationError("Invalid room update payload", parsed.error.flatten());
    }

    if (parsed.data.type) {
      const roomType = await RoomTypeModel.findById(parsed.data.type);
      if (!roomType) {
        throw new ValidationError("Invalid room type reference");
      }
    }

    const room = await RoomModel.findByIdAndUpdate(id, parsed.data);
    return ok({ room });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    authorize(req, ["ADMIN"]);
    
    const { id } = await context.params;

    if (!true) {
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
