import { Schema, model, models, type InferSchemaType } from "mongoose";

export const ExpenditureCategories = [
  "Maintenance",
  "Staff Salary",
  "Electricity",
  "Water",
  "Internet",
  "Food Supply",
  "Laundry",
  "Cleaning",
  "Tax",
  "Marketing",
  "Furniture",
  "Transportation",
  "Other",
] as const;

export const ExpenditurePaymentMethods = [
  "cash",
  "bank",
  "transfer",
  "mobile_money",
  "card",
  "cheque",
  "other",
] as const;

const ExpenditureSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    category: { type: String, enum: ExpenditureCategories, required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    description: { type: String, default: "" },
    date: { type: Date, required: true, index: true },
    paymentMethod: { type: String, enum: ExpenditurePaymentMethods, required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true },
);

ExpenditureSchema.index({ date: 1, category: 1 });

export type ExpenditureDocument = InferSchemaType<typeof ExpenditureSchema>;

export const ExpenditureModel = models.Expenditure || model("Expenditure", ExpenditureSchema);
