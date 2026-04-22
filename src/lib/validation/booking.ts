import { z } from "zod";

export const bookingQuerySchema = z.object({
  arrivalDate: z.string().date(),
  nights: z.coerce.number().int().min(1).max(30),
  guests: z.coerce.number().int().min(1).max(10),
});

export const availabilitySchema = z.object({
  arrivalDate: z.string().date(),
  nights: z.coerce.number().int().min(1).max(30),
  guests: z.coerce.number().int().min(1).max(10),
});

export const createBookingSchema = z.object({
  userId: z.string().min(1).optional(),
  roomId: z.string().min(1),
  arrivalDate: z.string().date(),
  nights: z.number().int().min(1).max(30),
  guests: z.object({
    adults: z.number().int().min(1).max(10),
    children: z.number().int().min(0).max(10),
  }),
  pricingPlan: z.enum(["BED_ONLY", "BED_BREAKFAST"]),
  guest: z.object({
    fullName: z.string().min(2).max(100),
    email: z.string().email(),
    phone: z.string().min(7).max(20),
    identityDocumentUrl: z.string().min(1),
    privacyAccepted: z.boolean().refine((v) => v),
  }),
  idempotencyKey: z.string().uuid(),
});

export const paymentIntentSchema = z.object({
  bookingId: z.string().min(1),
  idempotencyKey: z.string().uuid(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});
