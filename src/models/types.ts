import type {
  UserRole,
  UserProvider,
  IdentityType,
  RoomStatus,
  BookingStatus,
  PricingPlan,
  BookingPaymentStatus,
  PaymentStatus,
  PaymentMethod,
} from "@/models/enums";

// Row interfaces - flat columns from database
export interface UserRow {
  id: string;
  email: string;
  passwordHash: string | null;
  name: string;
  role: UserRole;
  phone: string | null;
  provider: UserProvider;
  providerId: string | null;
  identityType: IdentityType;
  passportDocumentUrl: string | null;
  privacyAcceptedAt: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RoomTypeRow {
  id: string;
  name: string;
  code: string;
  description: string;
  breakfastAddonPrice: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RoomRow {
  id: string;
  roomNumber: string;
  typeId: string;
  pricePerNight: number;
  capacity: number;
  images: string[];
  status: RoomStatus;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  type?: RoomTypeRow;
}

export interface BookingRow {
  id: string;
  bookingRef: string;
  userId: string | null;
  roomId: string;
  status: BookingStatus;
  pricingPlan: PricingPlan;
  guestsAdults: number;
  guestsChildren: number;
  arrivalDate: Date;
  nights: number;
  departureDate: Date;
  totalPrice: number;
  pricingPerNight: number;
  pricingAddons: number;
  pricingSubtotal: number;
  pricingTaxes: number;
  pricingTotal: number;
  pricingCurrency: string;
  guestFullName: string;
  guestEmail: string;
  guestPhone: string | null;
  guestIdentityDocumentUrl: string | null;
  guestPrivacyAcceptedAt: Date;
  paymentStatus: BookingPaymentStatus;
  amountPaid: number;
  idempotencyKey: string | null;
  checkInAt: Date | null;
  checkOutAt: Date | null;
  cancelledAt: Date | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  room?: RoomRow;
  payments?: PaymentRow[];
}

export interface PaymentRow {
  id: string;
  bookingId: string;
  userId: string | null;
  amount: number;
  status: PaymentStatus;
  method: PaymentMethod;
  transactionReference: string | null;
  idempotencyKey: string | null;
  receiptUrl: string | null;
  rawPayload: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

// Create input types
export interface CreateUserInput {
  email: string;
  passwordHash?: string;
  name: string;
  role?: UserRole;
  phone?: string;
  provider?: UserProvider;
  providerId?: string;
  identityType?: IdentityType;
  passportDocumentUrl?: string;
  privacyAcceptedAt?: Date;
  isActive?: boolean;
}

export interface CreateRoomTypeInput {
  name: string;
  code: string;
  description?: string;
  breakfastAddonPrice?: number;
  isActive?: boolean;
}

export interface CreateRoomInput {
  roomNumber: string;
  typeId: string;
  pricePerNight: number;
  capacity: number;
  images?: string[];
  status?: RoomStatus;
  isActive?: boolean;
}

export interface CreateBookingInput {
  bookingRef: string;
  userId: string | null;
  roomId: string;
  status?: BookingStatus;
  pricingPlan: PricingPlan;
  guestsAdults: number;
  guestsChildren?: number;
  arrivalDate: Date;
  nights: number;
  departureDate: Date;
  totalPrice: number;
  pricingPerNight: number;
  pricingAddons?: number;
  pricingSubtotal: number;
  pricingTaxes: number;
  pricingTotal: number;
  pricingCurrency?: string;
  guestFullName: string;
  guestEmail: string;
  guestPhone?: string;
  guestIdentityDocumentUrl?: string;
  guestPrivacyAcceptedAt: Date;
  paymentStatus?: BookingPaymentStatus;
  amountPaid?: number;
  idempotencyKey?: string;
  checkInAt?: Date | null;
  checkOutAt?: Date | null;
  cancelledAt?: Date | null;
  metadata?: Record<string, unknown>;
}

export interface CreatePaymentInput {
  bookingId: string;
  userId?: string | null;
  amount: number;
  status: PaymentStatus;
  method: PaymentMethod;
  transactionReference?: string;
  idempotencyKey?: string;
  receiptUrl?: string;
  rawPayload?: Record<string, unknown>;
}
