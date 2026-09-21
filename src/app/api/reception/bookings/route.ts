import { authorize } from "@/lib/auth/rbac";
import { connectDb } from "@/lib/db/mongoose";
import { fail, ok } from "@/lib/http";
import mongoose from "mongoose";
import { BookingModel } from "@/models/Booking";
import { RoomModel } from "@/models/Room";
import { UserModel } from "@/models/User";

export async function GET(req: Request) {
  try {
    authorize(req, ["OWNER", "ADMIN", "RECEPTIONIST"]);
    await connectDb();

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();
    const filter: Record<string, unknown> = {};
    if (q) {
      filter.$or = [
        { bookingRef: { $regex: q, $options: "i" } },
        { "guestSnapshot.fullName": { $regex: q, $options: "i" } },
        { "guestSnapshot.email": { $regex: q, $options: "i" } },
      ];
    }

    const bookings = await BookingModel.find(filter).sort({ createdAt: -1 }).limit(150).lean();
    const roomIds = Array.from(
      new Set(
        bookings
          .map((booking) => String(booking.roomId ?? ""))
          .filter((id) => mongoose.isValidObjectId(id)),
      ),
    );

    const userIds = Array.from(
      new Set(
        bookings
          .map((booking) => String(booking.userId ?? ""))
          .filter((id) => mongoose.isValidObjectId(id)),
      ),
    );

    const [rooms, users] = await Promise.all([
      RoomModel.find({ _id: { $in: roomIds } }, { roomNumber: 1, type: 1, status: 1 }).lean(),
      UserModel.find({ _id: { $in: userIds } }, { name: 1, email: 1, phone: 1, role: 1, identityType: 1, passportDocumentUrl: 1, provider: 1 }).lean(),
    ]);

    const roomMap = new Map(rooms.map((room) => [String(room._id), room]));
    const userMap = new Map(users.map((user) => [String(user._id), user]));

    const detailedBookings = bookings.map((booking) => {
      const room = roomMap.get(String(booking.roomId ?? ""));
      const user = userMap.get(String(booking.userId ?? ""));

      return {
        ...booking,
        room: room
          ? {
              id: String(room._id),
              roomNumber: room.roomNumber,
              status: room.status,
            }
          : null,
        customer: user
          ? {
              id: String(user._id),
              name: user.name,
              email: user.email,
              phone: user.phone,
              role: user.role,
              identityType: user.identityType,
              passportDocumentUrl: user.passportDocumentUrl,
              provider: user.provider,
            }
          : null,
      };
    });

    return ok({ bookings: detailedBookings });
  } catch (error) {
    return fail(error);
  }
}
