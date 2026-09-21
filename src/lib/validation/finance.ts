import { z } from "zod";
import { ExpenditureCategories, ExpenditurePaymentMethods } from "@/models/Expenditure";
import { RevenueSources } from "@/models/RevenueEntry";

export const createExpenditureSchema = z.object({
  title: z.string().trim().min(2).max(120),
  category: z.enum(ExpenditureCategories),
  amount: z.number().positive(),
  description: z.string().trim().max(1000).optional(),
  date: z.string().date(),
  paymentMethod: z.enum(ExpenditurePaymentMethods),
});

export const updateExpenditureSchema = z.object({
  title: z.string().trim().min(2).max(120).optional(),
  category: z.enum(ExpenditureCategories).optional(),
  amount: z.number().positive().optional(),
  description: z.string().trim().max(1000).optional(),
  date: z.string().date().optional(),
  paymentMethod: z.enum(ExpenditurePaymentMethods).optional(),
}).refine((input) => Object.keys(input).length > 0, {
  message: "Provide at least one field to update",
});

export const createRevenueEntrySchema = z.object({
  title: z.string().trim().min(2).max(120),
  source: z.enum(RevenueSources),
  amount: z.number().positive(),
  description: z.string().trim().max(1000).optional(),
  date: z.string().date(),
  bookingId: z.string().trim().optional(),
});

export const updateRevenueEntrySchema = z.object({
  title: z.string().trim().min(2).max(120).optional(),
  source: z.enum(RevenueSources).optional(),
  amount: z.number().positive().optional(),
  description: z.string().trim().max(1000).optional(),
  date: z.string().date().optional(),
  bookingId: z.string().trim().optional(),
}).refine((input) => Object.keys(input).length > 0, {
  message: "Provide at least one field to update",
});
