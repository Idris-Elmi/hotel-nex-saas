import { z } from "zod";

export const roomStatusSchema = z.enum(["AVAILABLE", "RESERVED", "OCCUPIED", "MAINTENANCE"]);

export const createRoomTypeSchema = z.object({
  name: z.string().min(2).max(80),
  code: z.string().min(2).max(20),
  description: z.string().max(500).optional().default(""),
  breakfastAddonPrice: z.number().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const updateRoomTypeSchema = createRoomTypeSchema.partial();

export const createRoomSchema = z.object({
  roomNumber: z.string().min(1).max(30),
  type: z.string().min(1),
  pricePerNight: z.number().min(0),
  capacity: z.number().int().min(1).max(20),
  images: z.array(z.string().min(1)).default([]),
  status: roomStatusSchema.default("AVAILABLE"),
  isActive: z.boolean().default(true),
});

export const updateRoomSchema = createRoomSchema.partial();
