import { authorize } from "@/lib/auth/rbac";

import { fail, ok } from "@/lib/http";
import { ValidationError } from "@/lib/errors";
import { createRoomSchema } from "@/lib/validation/room";
import { RoomModel } from "@/models/room.model";
import { RoomTypeModel } from "@/models/room-type.model";

export async function GET(req: Request) {
  try {
    authorize(req, ["ADMIN"]);
    

    const rooms = await RoomModel.find(undefined, { sort: "room_number ASC" });
    const typeIds = Array.from(
      new Set(
        rooms
          .map((room) => String(room.type ?? ""))
          .filter((typeId) => true),
      ),
    );

    const roomTypes = await RoomTypeModel.find({ _id: { $in: typeIds } });
    const roomTypeMap = new Map(roomTypes.map((roomType) => [String(roomType._id), roomType]));

    const hydratedRooms = rooms.map((room) => ({
      ...room,
      type: roomTypeMap.get(String(room.type ?? "")) ?? null,
    }));

    return ok({ rooms: hydratedRooms });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(req: Request) {
  try {
    authorize(req, ["ADMIN"]);
    

    const rawBody = await req.json();
    const normalizedRoomNumber = typeof rawBody?.roomNumber === "string"
      ? rawBody.roomNumber.trim().toUpperCase()
      : rawBody?.roomNumber;

    const normalizedBody = {
      ...rawBody,
      roomNumber: normalizedRoomNumber,
    };

    const parsed = createRoomSchema.safeParse(normalizedBody);
    if (!parsed.success) {
      throw new ValidationError("Invalid room payload", parsed.error.flatten());
    }

    const roomType = await RoomTypeModel.findById(parsed.data.type);
    if (!roomType) {
      throw new ValidationError("Invalid room type reference");
    }

    const existingRoom = await RoomModel.findOne({ roomNumber: parsed.data.roomNumber })
      .collation({ locale: "en", strength: 2 })
      ;
    if (existingRoom) {
      return ok(
        {
          room: {
            ...existingRoom,
            type: {
              _id: String(roomType._id),
              name: roomType.name,
              code: roomType.code,
              breakfastAddonPrice: roomType.breakfastAddonPrice,
              isActive: roomType.isActive,
            },
          },
          alreadyExists: true,
          message: "Room number already exists. Returned existing room.",
        },
        200,
      );
    }

    let room;
    try {
      room = await RoomModel.create({
        ...parsed.data,
      });
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: number }).code === 11000
      ) {
        const conflictingRoom = await RoomModel.findOne({ roomNumber: parsed.data.roomNumber })
          .collation({ locale: "en", strength: 2 })
          ;

        return ok(
          {
            room: conflictingRoom
              ? {
                  ...conflictingRoom,
                  type: {
                    _id: String(roomType._id),
                    name: roomType.name,
                    code: roomType.code,
                    breakfastAddonPrice: roomType.breakfastAddonPrice,
                    isActive: roomType.isActive,
                  },
                }
              : null,
            alreadyExists: true,
            message: "Room number already exists. Returned existing room.",
          },
          200,
        );
      }
      throw error;
    }

    return ok(
      {
        room: {
          ...room.toObject(),
          type: {
            _id: String(roomType._id),
            name: roomType.name,
            code: roomType.code,
            breakfastAddonPrice: roomType.breakfastAddonPrice,
            isActive: roomType.isActive,
          },
        },
      },
      201,
    );
  } catch (error) {
    return fail(error);
  }
}
