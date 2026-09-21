import { Schema, model, models, type InferSchemaType } from "mongoose";
import { RoomStatusValues } from "@/models/enums";

const RoomSchema = new Schema(
  {
    roomNumber: { type: String, required: true },
    type: { type: Schema.Types.ObjectId, ref: "RoomType", required: true, index: true },
    pricePerNight: { type: Number, min: 0, required: true },
    capacity: { type: Number, min: 1, required: true },
    images: { type: [String], default: [] },
    status: { type: String, enum: RoomStatusValues, default: "AVAILABLE", index: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

RoomSchema.index({ roomNumber: 1 }, { unique: true });
RoomSchema.index({ type: 1, isActive: 1, status: 1, capacity: 1 });

export type RoomDocument = InferSchemaType<typeof RoomSchema>;

export const RoomModel = models.Room || model("Room", RoomSchema);
