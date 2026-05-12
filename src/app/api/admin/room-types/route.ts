import { authorize } from "@/lib/auth/rbac";

import { fail, ok } from "@/lib/http";
import { ValidationError } from "@/lib/errors";
import { createRoomTypeSchema } from "@/lib/validation/room";
import { RoomTypeModel } from "@/models/room-type.model";

export async function GET(req: Request) {
  try {
    authorize(req, ["ADMIN"]);
    
    const types = await RoomTypeModel.find(undefined, { sort: "name ASC" });
    return ok({ types });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(req: Request) {
  try {
    authorize(req, ["ADMIN"]);
    

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
