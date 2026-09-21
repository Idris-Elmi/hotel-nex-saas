export const BookingStatusValues = [
  "PENDING",
  "CONFIRMED",
  "CHECKED_IN",
  "CHECKED_OUT",
  "CANCELLED",
] as const;

export const RoomStatusValues = ["AVAILABLE", "RESERVED", "OCCUPIED", "MAINTENANCE"] as const;

export const PricingPlanValues = ["BED_ONLY", "BED_BREAKFAST"] as const;

export const PaymentStatusValues = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "PAID",
  "PARTIAL",
  "REFUNDED",
] as const;

export type BookingStatus = (typeof BookingStatusValues)[number];
export type RoomStatus = (typeof RoomStatusValues)[number];
export type PricingPlan = (typeof PricingPlanValues)[number];
export type PaymentStatus = (typeof PaymentStatusValues)[number];
