import { RoomModel } from "@/models/Room";
import { BookingModel } from "@/models/Booking";

export async function syncRoomStatus(roomId: string): Promise<void> {
  const room = await RoomModel.findById(roomId).lean();

  if (!room || room.status === "MAINTENANCE") {
    return;
  }

  const hasCheckedIn = await BookingModel.exists({
    roomId,
    status: "CHECKED_IN",
  });

  if (hasCheckedIn) {
    await RoomModel.findByIdAndUpdate(roomId, { status: "OCCUPIED" });
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
