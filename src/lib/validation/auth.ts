import { z } from "zod";

export const authRoleSchema = z.enum(["ADMIN", "RECEPTIONIST", "CUSTOMER"]);
export const staffRoleSchema = z.enum(["ADMIN", "RECEPTIONIST"]);

export const registerSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  role: staffRoleSchema,
  passportDocumentUrl: z.string().min(1),
});

export const customerRegisterSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  phone: z.string().min(7).max(20).optional(),
  passportDocumentUrl: z.string().min(1).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});
