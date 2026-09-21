import { authorize } from "@/lib/auth/rbac";
import { connectDb } from "@/lib/db/mongoose";
import { fail, ok } from "@/lib/http";
import mongoose from "mongoose";
import { BookingModel } from "@/models/Booking";
import { RoomModel } from "@/models/Room";
import { UserModel } from "@/models/User";

export async function GET(req: Request) {
  try {
    authorize(req, ["OWNER"]);
    await connectDb();

    const { searchParams } = new URL(req.url);
    const bookingId = searchParams.get("bookingId")?.trim();
    const guestName = searchParams.get("guestName")?.trim();
    const guestEmail = searchParams.get("guestEmail")?.trim();
    const guestPhone = searchParams.get("guestPhone")?.trim();

    let filter = {};

    if (bookingId) {
      filter = { bookingRef: { $regex: bookingId, $options: "i" } };
    } else if (guestName) {
      filter = { "guestSnapshot.fullName": { $regex: guestName, $options: "i" } };
    } else if (guestEmail) {
      filter = { "guestSnapshot.email": { $regex: guestEmail, $options: "i" } };
    } else if (guestPhone) {
      filter = { "guestSnapshot.phone": { $regex: guestPhone, $options: "i" } };
    } else {
      return ok({ bookings: [] });
    }

    const bookings = await BookingModel.find(filter).sort({ createdAt: -1 }).limit(20).lean();

    const roomIds = Array.from(
      new Set(
        bookings
          .map((b) => String(b.roomId ?? ""))
          .filter((id) => mongoose.isValidObjectId(id)),
      ),
    );

    const userIds = Array.from(
      new Set(
        bookings
          .map((b) => String(b.userId ?? ""))
          .filter((id) => mongoose.isValidObjectId(id)),
      ),
    );

    const [rooms, users] = await Promise.all([
      RoomModel.find({ _id: { $in: roomIds } }, { roomNumber: 1, type: 1, status: 1 }).lean(),
      UserModel.find({ _id: { $in: userIds } }, { name: 1, email: 1, phone: 1, role: 1, identityType: 1, passportDocumentUrl: 1, provider: 1 }).lean(),
    ]);

    const roomMap = new Map(rooms.map((r) => [String(r._id), r]));
    const userMap = new Map(users.map((u) => [String(u._id), u]));

    const enriched = bookings.map((b) => {
      const room = roomMap.get(String(b.roomId ?? ""));
      const user = userMap.get(String(b.userId ?? ""));
      return {
        ...b,
        roomNumber: room?.roomNumber ?? null,
        room: room
          ? { id: String(room._id), roomNumber: room.roomNumber, status: room.status }
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
        payments: [],
      };
    });

    if (bookingId && enriched.length === 1) {
      return ok(enriched[0]);
    }

    return ok(enriched);
  } catch (error) {
    return fail(error);
  }
}
