import { addDays, differenceInCalendarDays } from "date-fns";
import { appConfig } from "@/lib/config";
import { ValidationError } from "@/lib/errors";
import type { PricingPlan } from "@/models/enums";
import { RoomModel } from "@/models/room.model";

export type PriceResult = {
  perNight: number;
  addons: number;
  subtotal: number;
  taxes: number;
  total: number;
  currency: string;
  departureDate: Date;
};

export async function calculateBookingPrice(input: {
  roomId: string;
  arrivalDate: Date;
  nights: number;
  pricingPlan: PricingPlan;
}): Promise<PriceResult> {
  const room = await RoomModel.findById(input.roomId);
  if (!room || !room.isActive) {
    throw new ValidationError("Selected room does not exist");
  }

  const departureDate = addDays(input.arrivalDate, input.nights);
  const nights = differenceInCalendarDays(departureDate, input.arrivalDate);
  if (nights <= 0) {
    throw new ValidationError("Invalid date range");
  }

  const roomType = room.type as { breakfastAddonPrice?: number } | null;
  const perNight = room.pricePerNight;
  const addons = input.pricingPlan === "BED_BREAKFAST" ? (roomType?.breakfastAddonPrice ?? 0) * nights : 0;
  const subtotal = perNight * nights + addons;
  const taxes = Math.round(subtotal * 0.1);
  const total = subtotal + taxes;

  return {
    perNight,
    addons,
    subtotal,
    taxes,
    total,
    currency: appConfig.baseCurrency,
    departureDate,
  };
}
