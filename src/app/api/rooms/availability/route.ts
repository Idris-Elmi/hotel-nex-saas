import { connectDb } from "@/lib/db/mongoose";
import { fail, ok } from "@/lib/http";
import { availabilitySchema } from "@/lib/validation/booking";
import { ValidationError } from "@/lib/errors";
import { findAvailableRooms } from "@/modules/rooms/services/availability.service";

function pickFirstDefined(...values: unknown[]) {
  return values.find((value) => value !== undefined && value !== null && value !== "");
}

function toInteger(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  return Math.floor(parsed);
}

function normalizeAvailabilityInput(input: Record<string, unknown>) {
  const today = new Date().toISOString().slice(0, 10);

  const arrivalDate =
    pickFirstDefined(input.arrivalDate, input.arrival_date, input.checkInDate, input.date) ?? today;

  const nightsRaw = pickFirstDefined(input.nights, input.nightCount, input.stayNights);
  const guestsRaw = pickFirstDefined(input.guests, input.guestCount, input.totalGuests);
  const adultsRaw = pickFirstDefined(input.adults, input.adultCount);
  const childrenRaw = pickFirstDefined(input.children, input.childCount);

  const adults = Math.max(toInteger(adultsRaw) ?? 0, 0);
  const children = Math.max(toInteger(childrenRaw) ?? 0, 0);

  const nights = Math.max(toInteger(nightsRaw) ?? 2, 1);
  const fallbackGuests = adults + children > 0 ? adults + children : 2;
  const guests = Math.max(toInteger(guestsRaw) ?? fallbackGuests, 1);

  return {
    arrivalDate,
    nights,
    guests,
  };
}

async function resolveAvailability(input: Record<string, unknown>) {
  const parsed = availabilitySchema.safeParse(normalizeAvailabilityInput(input));
  if (!parsed.success) {
    throw new ValidationError("Invalid availability query", parsed.error.flatten());
  }

  const rooms = await findAvailableRooms(
    new Date(parsed.data.arrivalDate),
    parsed.data.nights,
    parsed.data.guests,
  );

  return ok({ results: rooms });
}

export async function GET(req: Request) {
  try {
    await connectDb();
    const { searchParams } = new URL(req.url);

    return await resolveAvailability({
      arrivalDate: searchParams.get("arrivalDate"),
      nights: searchParams.get("nights"),
      guests: searchParams.get("guests"),
    });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(req: Request) {
  try {
    await connectDb();
    const { searchParams } = new URL(req.url);

    let body: Record<string, unknown> = {};
    const rawBody = await req.text();

    if (rawBody.trim()) {
      try {
        body = JSON.parse(rawBody) as Record<string, unknown>;
      } catch {
        const form = new URLSearchParams(rawBody);
        if (form.has("arrivalDate") || form.has("nights") || form.has("guests")) {
          body = {
            arrivalDate: form.get("arrivalDate"),
            nights: form.get("nights"),
            guests: form.get("guests"),
          };
        } else {
          throw new ValidationError("Invalid request payload");
        }
      }
    }

    return await resolveAvailability({
      arrivalDate: body.arrivalDate ?? searchParams.get("arrivalDate"),
      nights: body.nights ?? searchParams.get("nights"),
      guests: body.guests ?? searchParams.get("guests"),
      adults: body.adults ?? searchParams.get("adults"),
      children: body.children ?? searchParams.get("children"),
    });
  } catch (error) {
    return fail(error);
  }
}
