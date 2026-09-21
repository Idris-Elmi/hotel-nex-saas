import mongoose, { Schema, Document } from 'mongoose'

export interface IBookingDraft extends Document {
  roomId:              string
  arrivalDate:         string
  nights:              number
  adults:              number
  children:            number
  pricingPlan:         string
  guestInfo: {
    firstName:          string
    lastName:           string
    fullName:           string
    email:              string
    phone:              string
    address:            string
    identityDocumentUrl:string
  }
  userId?:   string
  bookingId?: string
  usedAt?:   Date
  createdAt: Date
}

const BookingDraftSchema = new Schema<IBookingDraft>({
  roomId:       { type: String, required: true },
  arrivalDate:  { type: String, required: true },
  nights:       { type: Number, required: true },
  adults:       { type: Number, required: true },
  children:     { type: Number, default: 0 },
  pricingPlan:  { type: String, required: true },
  guestInfo: {
    firstName:           { type: String, required: true },
    lastName:            { type: String, required: true },
    fullName:            { type: String, required: true },
    email:               { type: String, required: true },
    phone:               { type: String, required: true },
    address:             { type: String, default: '' },
    identityDocumentUrl: { type: String, default: '' },
  },
  userId:    { type: String, default: null },
  bookingId: { type: String, default: null },
  usedAt:    { type: Date,   default: null },
}, { timestamps: true })

BookingDraftSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 86400,
    partialFilterExpression: { usedAt: null } }
)

export default mongoose.models.BookingDraft ||
  mongoose.model<IBookingDraft>('BookingDraft', BookingDraftSchema)