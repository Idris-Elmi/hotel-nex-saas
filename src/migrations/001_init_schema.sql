CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE user_role AS ENUM ('ADMIN','RECEPTIONIST','CUSTOMER');
CREATE TYPE user_provider AS ENUM ('local','google','facebook');
CREATE TYPE identity_type AS ENUM ('passport','id_card');
CREATE TYPE room_status AS ENUM ('AVAILABLE','RESERVED','OCCUPIED','MAINTENANCE');
CREATE TYPE booking_status AS ENUM ('PENDING','CONFIRMED','CHECKED_IN','CHECKED_OUT','CANCELLED');
CREATE TYPE pricing_plan AS ENUM ('BED_ONLY','BED_BREAKFAST');
CREATE TYPE booking_payment_status AS ENUM ('PENDING','PARTIAL','PAID','REFUNDED','REJECTED');
CREATE TYPE payment_status AS ENUM ('PENDING','APPROVED','REJECTED','PAID','PARTIAL','REFUNDED');
CREATE TYPE payment_method AS ENUM ('bank','mobile_money','cash','transfer','upload');

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  name          TEXT NOT NULL,
  role          user_role NOT NULL DEFAULT 'CUSTOMER',
  phone         TEXT,
  provider      user_provider NOT NULL DEFAULT 'local',
  provider_id   TEXT,
  identity_type identity_type NOT NULL DEFAULT 'passport',
  passport_document_url TEXT,
  privacy_accepted_at   TIMESTAMPTZ,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_provider_provider_id_idx
  ON users(provider, provider_id) WHERE provider_id IS NOT NULL;

CREATE TABLE room_types (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT NOT NULL UNIQUE,
  code                  TEXT NOT NULL UNIQUE,
  description           TEXT NOT NULL DEFAULT '',
  breakfast_addon_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_active             BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE rooms (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_number    TEXT NOT NULL UNIQUE,
  type_id        UUID NOT NULL REFERENCES room_types(id),
  price_per_night NUMERIC(10,2) NOT NULL,
  capacity       INT NOT NULL,
  images         TEXT[] NOT NULL DEFAULT '{}',
  status         room_status NOT NULL DEFAULT 'AVAILABLE',
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX rooms_type_active_status_capacity_idx ON rooms(type_id, is_active, status, capacity);

CREATE TABLE bookings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_ref     TEXT NOT NULL UNIQUE,
  user_id         UUID REFERENCES users(id),
  room_id         UUID NOT NULL REFERENCES rooms(id),
  status          booking_status NOT NULL DEFAULT 'PENDING',
  pricing_plan    pricing_plan NOT NULL,
  guests_adults   INT NOT NULL,
  guests_children INT NOT NULL DEFAULT 0,
  arrival_date    DATE NOT NULL,
  nights          INT NOT NULL,
  departure_date  DATE NOT NULL,
  total_price     NUMERIC(10,2) NOT NULL,
  pricing_per_night   NUMERIC(10,2) NOT NULL,
  pricing_addons      NUMERIC(10,2) NOT NULL DEFAULT 0,
  pricing_subtotal    NUMERIC(10,2) NOT NULL,
  pricing_taxes       NUMERIC(10,2) NOT NULL,
  pricing_total       NUMERIC(10,2) NOT NULL,
  pricing_currency    TEXT NOT NULL DEFAULT 'USD',
  guest_full_name             TEXT NOT NULL,
  guest_email                 TEXT NOT NULL,
  guest_phone                 TEXT,
  guest_identity_document_url TEXT,
  guest_privacy_accepted_at   TIMESTAMPTZ NOT NULL,
  payment_status  booking_payment_status NOT NULL DEFAULT 'PENDING',
  amount_paid     NUMERIC(10,2) NOT NULL DEFAULT 0,
  idempotency_key TEXT UNIQUE,
  check_in_at     TIMESTAMPTZ,
  check_out_at    TIMESTAMPTZ,
  cancelled_at    TIMESTAMPTZ,
  metadata        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX bookings_room_dates_status_idx ON bookings(room_id, arrival_date, departure_date, status);
CREATE INDEX bookings_status_arrival_idx ON bookings(status, arrival_date);
CREATE INDEX bookings_user_id_idx ON bookings(user_id);
CREATE INDEX bookings_guest_email_idx ON bookings(guest_email);

CREATE TABLE payments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id            UUID NOT NULL REFERENCES bookings(id),
  user_id               UUID REFERENCES users(id),
  amount                NUMERIC(10,2) NOT NULL,
  status                payment_status NOT NULL,
  method                payment_method NOT NULL,
  transaction_reference TEXT,
  idempotency_key       TEXT,
  receipt_url           TEXT,
  raw_payload           JSONB,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX payments_idempotency_key_idx
  ON payments(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX payments_booking_id_created_idx ON payments(booking_id, created_at DESC);
CREATE INDEX payments_status_idx ON payments(status);
CREATE INDEX payments_method_idx ON payments(method);
