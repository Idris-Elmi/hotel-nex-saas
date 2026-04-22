import { z } from "zod";
import { createBookingSchema } from "@/lib/validation/booking";

export const walkInBookingSchema = createBookingSchema;

export const extendStaySchema = z.object({
  extraNights: z.number().int().min(1).max(30),
});

export const checkOutSchema = z.object({
  actualCheckOutAt: z.string().datetime().optional(),
  payment: z
    .object({
      amount: z.number().positive(),
      method: z.enum(["bank", "mobile_money", "cash"]),
    })
    .optional(),
});
