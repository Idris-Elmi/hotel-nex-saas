import { RoomModel } from "@/models/room.model";

export async function syncRoomStatus(roomId: string): Promise<void> {
  const BookingModel = (await import("@/models/booking.model")).BookingModel;
  const room = await RoomModel.findById(roomId);

  if (!room || room.status === "MAINTENANCE") {
    return;
  }

  const hasCheckedIn = await BookingModel.exists({
    roomId,
    status: "CHECKED_IN",
  });

  if (hasCheckedIn) {
    await RoomModel.findByIdAndUpdate(roomId, { status: "RESERVED" });
    return;
  }

  const hasReserved = await BookingModel.exists({
    roomId,
    status: { $in: ["PENDING", "CONFIRMED"] },
  });

  await RoomModel.findByIdAndUpdate(roomId, {
    status: hasReserved ? "RESERVED" : "AVAILABLE",
  });
}
