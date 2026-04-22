import { Schema, model, models, type InferSchemaType } from "mongoose";
import { PaymentStatusValues } from "@/models/enums";

const PaymentSchema = new Schema(
  {
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: false, index: true },
    amount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: PaymentStatusValues, required: true, index: true },
    method: { type: String, enum: ["bank", "mobile_money", "cash", "transfer", "upload"], required: true, index: true },
    transactionReference: { type: String, index: true },
    idempotencyKey: { type: String, sparse: true, index: true },
    receiptUrl: { type: String },
    rawPayload: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

PaymentSchema.index({ bookingId: 1, createdAt: -1 });

export type PaymentDocument = InferSchemaType<typeof PaymentSchema>;

export const PaymentModel = models.Payment || model("Payment", PaymentSchema);
