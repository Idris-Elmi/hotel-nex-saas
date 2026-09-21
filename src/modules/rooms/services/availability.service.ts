import { addDays } from "date-fns";
import mongoose from "mongoose";
import { BookingModel } from "@/models/Booking";
import { RoomModel } from "@/models/Room";
import { calculateBookingPrice } from "@/modules/rooms/services/pricing.service";

export async function findAvailableRooms(arrivalDate: Date, nights: number, guests: number) {
  const departureDate = addDays(arrivalDate, nights);

  const blockedRoomIds = await BookingModel.find({
    status: { $in: ["PENDING", "CONFIRMED", "CHECKED_IN"] },
    arrivalDate: { $lt: departureDate },
    departureDate: { $gt: arrivalDate },
  })
    .select("roomId")
    .lean();

  const excludedIds = blockedRoomIds
    .map((booking) => String(booking.roomId ?? ""))
    .filter((roomId) => mongoose.isValidObjectId(roomId));

  const rooms = await RoomModel.find({
    isActive: true,
    status: "AVAILABLE",
    capacity: { $gte: guests },
    _id: { $nin: excludedIds },
  })
    .populate("type")
    .lean();

  const priced = await Promise.all(
    rooms.map(async (room) => {
      const bedOnly = await calculateBookingPrice({
        roomId: String(room._id),
        arrivalDate,
        nights,
        pricingPlan: "BED_ONLY",
      });

      const bedBreakfast = await calculateBookingPrice({
        roomId: String(room._id),
        arrivalDate,
        nights,
        pricingPlan: "BED_BREAKFAST",
      });

      return {
        id: String(room._id),
        roomNumber: room.roomNumber,
        images: Array.isArray(room.images) ? room.images : [],
        type: room.type,
        capacity: room.capacity,
        pricing: {
          BED_ONLY: bedOnly,
          BED_BREAKFAST: bedBreakfast,
        },
      };
    }),
  );

  return priced;
}
