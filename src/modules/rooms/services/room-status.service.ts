import { RoomModel } from "@/models/Room";

export async function syncRoomStatus(roomId: string): Promise<void> {
  const BookingModel = (await import("@/models/Booking")).BookingModel;
  const room = await RoomModel.findById(roomId).lean();

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
