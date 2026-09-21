import { Schema, model, models, type InferSchemaType } from "mongoose";

const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    passwordHash: { type: String },
    name: { type: String, required: true },
    image: { type: String },
    role: {
      type: String,
      enum: ["OWNER", "ADMIN", "RECEPTIONIST", "CUSTOMER"],
      default: "CUSTOMER",
      index: true,
    },
    phone: { type: String },
    address: { type: String },
    gender: { type: String, enum: ["male", "female", "other"], default: null },
    provider: { type: String, enum: ["local", "google", "facebook"], default: "local" },
    providerId: { type: String },
    identityType: { type: String, enum: ["passport", "id_card"], default: "passport" },
    passportDocumentUrl: { type: String },
    privacyAcceptedAt: { type: Date },
    isActive: { type: Boolean, default: true },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
  },
  { timestamps: true },
);

UserSchema.index(
  { provider: 1, providerId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      providerId: { $exists: true, $type: "string" },
    },
  },
);

export type UserDocument = InferSchemaType<typeof UserSchema>;

export const UserModel = models.User || model("User", UserSchema);
