import { Schema, model, models, type InferSchemaType } from "mongoose";

const RoomTypeSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true, unique: true, index: true },
    description: { type: String, default: "" },
    breakfastAddonPrice: { type: Number, min: 0, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

RoomTypeSchema.index({ name: 1 }, { unique: true });

export type RoomTypeDocument = InferSchemaType<typeof RoomTypeSchema>;

export const RoomTypeModel = models.RoomType || model("RoomType", RoomTypeSchema);
