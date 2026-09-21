import { ValidationError } from "@/lib/errors";
import { RevenueEntryModel } from "@/models/RevenueEntry";

export async function recordRoomServiceRevenue(input: {
  title: string;
  amount: number;
  description?: string;
  date?: Date;
  bookingId?: string;
  createdBy: string;
}) {
  if (!input.title.trim()) {
    throw new ValidationError("Room service title is required");
  }

  if (input.amount <= 0) {
    throw new ValidationError("Room service amount must be greater than zero");
  }

  const entry = await RevenueEntryModel.create({
    title: input.title.trim(),
    source: "ROOM_SERVICE",
    amount: input.amount,
    description: input.description ?? "",
    date: input.date ?? new Date(),
    bookingId: input.bookingId || undefined,
    createdBy: input.createdBy,
  });

  return entry.toObject();
}

export async function recordOtherIncome(input: {
  title: string;
  amount: number;
  description?: string;
  date?: Date;
  bookingId?: string;
  createdBy: string;
}) {
  if (!input.title.trim()) {
    throw new ValidationError("Revenue title is required");
  }

  if (input.amount <= 0) {
    throw new ValidationError("Revenue amount must be greater than zero");
  }

  const entry = await RevenueEntryModel.create({
    title: input.title.trim(),
    source: "OTHER",
    amount: input.amount,
    description: input.description ?? "",
    date: input.date ?? new Date(),
    bookingId: input.bookingId || undefined,
    createdBy: input.createdBy,
  });

  return entry.toObject();
}
