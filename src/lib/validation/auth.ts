import { z } from "zod";

export const authRoleSchema = z.enum(["OWNER", "ADMIN", "RECEPTIONIST", "CUSTOMER"]);
export const staffRoleSchema = z.enum(["OWNER", "ADMIN", "RECEPTIONIST"]);

const strongPassword = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128)
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^a-zA-Z0-9]/, "Password must contain at least one symbol");

export const registerSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  password: strongPassword,
  role: staffRoleSchema,
  phone: z.string().min(7).max(20).optional(),
  passportDocumentUrl: z.string().min(1).optional(),
});

export const customerRegisterSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  password: strongPassword,
  phone: z.string().min(7).max(20).optional(),
  passportDocumentUrl: z.string().min(1).optional(),
});

export const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email address"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1).max(256),
  password: strongPassword,
});
