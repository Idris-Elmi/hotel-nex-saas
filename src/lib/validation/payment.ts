import { z } from "zod";

export const createPaymentSchema = z.object({
  bookingId: z.string().min(1),
  bookingRef: z.string().trim().min(3).optional(),
  amount: z.number().positive(),
  method: z.enum(["bank", "mobile_money", "cash", "transfer", "upload"]),
  transactionReference: z.string().trim().min(3).max(120).optional(),
  receiptUrl: z.string().trim().min(1).optional(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "PAID", "PARTIAL", "REFUNDED"]).optional(),
  idempotencyKey: z.string().uuid().optional(),
}).superRefine((input, ctx) => {
  if (input.method !== "cash" && !input.transactionReference && !input.receiptUrl) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Provide receiptUrl or transactionReference",
      path: ["transactionReference"],
    });
  }
});

export const listPaymentsQuerySchema = z.object({
  bookingId: z.string().min(1),
});

export const adminPaymentFilterSchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
});

export const reviewPaymentSchema = z.object({
  action: z.enum(["approve", "reject"]),
  note: z.string().max(500).optional(),
});
