import { Schema, model, models, type InferSchemaType, type Types } from "mongoose";
import { BookingStatusValues, PricingPlanValues } from "@/models/enums";

const BookingSchema = new Schema(
  {
    bookingRef: { type: String, required: true, unique: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: false, index: true },
    roomId: { type: Schema.Types.ObjectId, ref: "Room", required: true, index: true },
    status: { type: String, enum: BookingStatusValues, default: "PENDING", index: true },
    pricingPlan: { type: String, enum: PricingPlanValues, required: true },
    guests: {
      adults: { type: Number, required: true, min: 1 },
      children: { type: Number, default: 0, min: 0 },
    },
    arrivalDate: { type: Date, required: true, index: true },
    nights: { type: Number, min: 1, required: true },
    departureDate: { type: Date, required: true, index: true },
    totalPrice: { type: Number, required: true, min: 0 },
    pricing: {
      perNight: { type: Number, required: true },
      addons: { type: Number, default: 0 },
      subtotal: { type: Number, required: true },
      taxes: { type: Number, required: true },
      total: { type: Number, required: true },
      currency: { type: String, default: "ETB" },
    },
    guestSnapshot: {
      fullName: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String },
      identityDocumentUrl: { type: String },
      privacyAcceptedAt: { type: Date, required: true },
    },
    paymentStatus: {
      type: String,
      enum: ["PENDING", "PARTIAL", "PAID", "REFUNDED", "REJECTED"],
      default: "PENDING",
      index: true,
    },
    amountPaid: { type: Number, default: 0 },
    checkInAt: { type: Date },
    checkOutAt: { type: Date },
    cancelledAt: { type: Date },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

BookingSchema.index({ roomId: 1, arrivalDate: 1, departureDate: 1, status: 1 }, { name: "room_date_overlap_idx" });
BookingSchema.index({ status: 1, arrivalDate: 1 });
BookingSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 86400, partialFilterExpression: { status: "PENDING" } },
);

export type BookingDocument = InferSchemaType<typeof BookingSchema> & { _id: Types.ObjectId };

export const BookingModel = models.Booking || model("Booking", BookingSchema);
