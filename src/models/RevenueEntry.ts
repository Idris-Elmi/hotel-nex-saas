import { Schema, model, models, type InferSchemaType } from "mongoose";

export const RevenueSources = ["ROOM_SERVICE", "OTHER"] as const;

const RevenueEntrySchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    source: { type: String, enum: RevenueSources, required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    description: { type: String, default: "" },
    date: { type: Date, required: true, index: true },
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking", required: false, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true },
);

RevenueEntrySchema.index({ date: 1, source: 1 });

export type RevenueEntryDocument = InferSchemaType<typeof RevenueEntrySchema>;

export const RevenueEntryModel = models.RevenueEntry || model("RevenueEntry", RevenueEntrySchema);
