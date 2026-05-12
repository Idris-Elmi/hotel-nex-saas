import { authorize } from "@/lib/auth/rbac";

import { fail, ok } from "@/lib/http";
import { BookingModel } from "@/models/booking.model";
import { RoomModel } from "@/models/room.model";
import { UserModel } from "@/models/user.model";
import { createBookingSchema } from "@/lib/validation/booking";
import { ValidationError } from "@/lib/errors";
import { createPendingBooking } from "@/modules/bookings/services/booking.service";

export async function GET(req: Request) {
  try {
    authorize(req, ["ADMIN", "RECEPTIONIST"]);

    const bookings = await BookingModel.find(undefined, { sort: "created_at DESC", limit: 150 });
    const roomIds = Array.from(
      new Set(
        bookings
          .map((booking) => booking.roomId ?? "")
          .filter((id) => !!id),
      ),
    );

    const userIds = Array.from(
      new Set(
        bookings
          .map((booking) => booking.userId ?? "")
          .filter((id) => !!id),
      ),
    );

    const rooms = await RoomModel.find(undefined, { populate: true });
    const userPromises = userIds.length > 0 ? await Promise.all(userIds.map(id => UserModel.findById(id))) : [];

    const roomMap = new Map(rooms.map((room) => [room.id, room]));
    const userMap = new Map(userPromises.filter(Boolean).map((user: any) => [user.id, user]));

    const detailedBookings = bookings.map((booking) => {
      const room = roomMap.get(booking.roomId ?? "");
      const user = userMap.get(booking.userId ?? "");

      return {
        ...booking,
        room: room
          ? {
              id: room.id,
              roomNumber: room.roomNumber,
              status: room.status,
            }
          : null,
        customer: user
          ? {
              id: user.id,
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

export async function POST(req: Request) {
  try {
    authorize(req, ["ADMIN", "RECEPTIONIST"]);
    

    const parsed = createBookingSchema.safeParse(await req.json());
    if (!parsed.success) {
      throw new ValidationError("Invalid booking payload", parsed.error.flatten());
    }

    const booking = await createPendingBooking({
      userId: parsed.data.userId,
      roomId: parsed.data.roomId,
      arrivalDate: new Date(parsed.data.arrivalDate),
      nights: parsed.data.nights,
      guests: parsed.data.guests,
      pricingPlan: parsed.data.pricingPlan,
      guest: parsed.data.guest,
      idempotencyKey: parsed.data.idempotencyKey,
    });

    return ok({ booking }, 201);
  } catch (error) {
    return fail(error);
  }
}
