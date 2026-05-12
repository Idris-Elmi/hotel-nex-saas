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

export const UserRoleValues = ["ADMIN", "RECEPTIONIST", "CUSTOMER"] as const;
export const UserProviderValues = ["local", "google", "facebook"] as const;
export const IdentityTypeValues = ["passport", "id_card"] as const;
export const BookingPaymentStatusValues = ["PENDING", "PARTIAL", "PAID", "REFUNDED", "REJECTED"] as const;
export const PaymentMethodValues = ["bank", "mobile_money", "cash", "transfer", "upload"] as const;

export type BookingStatus = (typeof BookingStatusValues)[number];
export type RoomStatus = (typeof RoomStatusValues)[number];
export type PricingPlan = (typeof PricingPlanValues)[number];
export type PaymentStatus = (typeof PaymentStatusValues)[number];
export type UserRole = (typeof UserRoleValues)[number];
export type UserProvider = (typeof UserProviderValues)[number];
export type IdentityType = (typeof IdentityTypeValues)[number];
export type BookingPaymentStatus = (typeof BookingPaymentStatusValues)[number];
export type PaymentMethod = (typeof PaymentMethodValues)[number];
