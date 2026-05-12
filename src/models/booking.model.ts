import { PoolClient } from "pg";
import pool from "@/lib/db/postgres";
import type { CreateBookingInput, BookingRow } from "./types";

function mapRowToBooking(row: any): BookingRow {
  return {
    id: row.id,
    bookingRef: row.booking_ref,
    userId: row.user_id,
    roomId: row.room_id,
    status: row.status,
    pricingPlan: row.pricing_plan,
    guestsAdults: row.guests_adults,
    guestsChildren: row.guests_children,
    arrivalDate: row.arrival_date,
    nights: row.nights,
    departureDate: row.departure_date,
    totalPrice: parseFloat(row.total_price),
    pricingPerNight: parseFloat(row.pricing_per_night),
    pricingAddons: parseFloat(row.pricing_addons),
    pricingSubtotal: parseFloat(row.pricing_subtotal),
    pricingTaxes: parseFloat(row.pricing_taxes),
    pricingTotal: parseFloat(row.pricing_total),
    pricingCurrency: row.pricing_currency,
    guestFullName: row.guest_full_name,
    guestEmail: row.guest_email,
    guestPhone: row.guest_phone,
    guestIdentityDocumentUrl: row.guest_identity_document_url,
    guestPrivacyAcceptedAt: row.guest_privacy_accepted_at,
    paymentStatus: row.payment_status,
    amountPaid: parseFloat(row.amount_paid),
    idempotencyKey: row.idempotency_key,
    checkInAt: row.check_in_at,
    checkOutAt: row.check_out_at,
    cancelledAt: row.cancelled_at,
    metadata: row.metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const BookingModel = {
  async findById(id: string, client?: PoolClient): Promise<BookingRow | null> {
    const db = client || pool;
    const result = await db.query("SELECT * FROM bookings WHERE id = $1", [id]);
    return result.rows[0] ? mapRowToBooking(result.rows[0]) : null;
  },

  async findOne(where: any, client?: PoolClient): Promise<BookingRow | null> {
    const db = client || pool;
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (where.idempotencyKey) {
      conditions.push(`idempotency_key = $${paramIndex}`);
      values.push(where.idempotencyKey);
      paramIndex++;
    }
    if (where.bookingRef) {
      conditions.push(`booking_ref = $${paramIndex}`);
      values.push(where.bookingRef);
      paramIndex++;
    }
    if (where.userId) {
      conditions.push(`user_id = $${paramIndex}`);
      values.push(where.userId);
      paramIndex++;
    }
    if (where.roomId) {
      conditions.push(`room_id = $${paramIndex}`);
      values.push(where.roomId);
      paramIndex++;
    }

    if (conditions.length === 0) return null;

    const query = `SELECT * FROM bookings WHERE ${conditions.join(" AND ")}`;
    const result = await db.query(query, values);
    return result.rows[0] ? mapRowToBooking(result.rows[0]) : null;
  },

  async find(filter?: any, options?: { sort?: string; limit?: number }, client?: PoolClient): Promise<BookingRow[]> {
    const db = client || pool;
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (filter?.roomId) {
      conditions.push(`room_id = $${paramIndex}`);
      values.push(filter.roomId);
      paramIndex++;
    }
    if (filter?.userId) {
      conditions.push(`user_id = $${paramIndex}`);
      values.push(filter.userId);
      paramIndex++;
    }
    if (filter?.status) {
      if (Array.isArray(filter.status)) {
        conditions.push(`status = ANY($${paramIndex}::booking_status[])`);
        values.push(filter.status);
      } else {
        conditions.push(`status = $${paramIndex}`);
        values.push(filter.status);
      }
      paramIndex++;
    }
    if (filter?.arrivalDate || filter?.departureDate) {
      if (filter.arrivalDate) {
        conditions.push(`departure_date > $${paramIndex}`);
        values.push(filter.arrivalDate);
        paramIndex++;
      }
      if (filter.departureDate) {
        conditions.push(`arrival_date < $${paramIndex}`);
        values.push(filter.departureDate);
        paramIndex++;
      }
    }
    if (filter?.guestEmail) {
      conditions.push(`guest_email = $${paramIndex}`);
      values.push(filter.guestEmail);
      paramIndex++;
    }

    let query = "SELECT * FROM bookings";
    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    const sort = options?.sort || "created_at DESC";
    query += ` ORDER BY ${sort}`;

    if (options?.limit) {
      query += ` LIMIT ${options.limit}`;
    }

    const result = await db.query(query, values);
    return result.rows.map(mapRowToBooking);
  },

  async create(data: CreateBookingInput, client?: PoolClient): Promise<BookingRow> {
    const db = client || pool;
    const result = await db.query(
      `INSERT INTO bookings (
        booking_ref, user_id, room_id, status, pricing_plan, guests_adults, guests_children,
        arrival_date, nights, departure_date, total_price, pricing_per_night, pricing_addons,
        pricing_subtotal, pricing_taxes, pricing_total, pricing_currency, guest_full_name,
        guest_email, guest_phone, guest_identity_document_url, guest_privacy_accepted_at,
        payment_status, amount_paid, idempotency_key, metadata
       ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
        $19, $20, $21, $22, $23, $24, $25, $26
       ) RETURNING *`,
      [
        data.bookingRef,
        data.userId || null,
        data.roomId,
        data.status || "PENDING",
        data.pricingPlan,
        data.guestsAdults,
        data.guestsChildren || 0,
        data.arrivalDate,
        data.nights,
        data.departureDate,
        data.totalPrice,
        data.pricingPerNight,
        data.pricingAddons || 0,
        data.pricingSubtotal,
        data.pricingTaxes,
        data.pricingTotal,
        data.pricingCurrency || "USD",
        data.guestFullName,
        data.guestEmail,
        data.guestPhone || null,
        data.guestIdentityDocumentUrl || null,
        data.guestPrivacyAcceptedAt,
        data.paymentStatus || "PENDING",
        data.amountPaid || 0,
        data.idempotencyKey || null,
        data.metadata || null,
      ],
    );
    return mapRowToBooking(result.rows[0]);
  },

  async update(id: string, data: Partial<BookingRow>, client?: PoolClient): Promise<BookingRow> {
    const db = client || pool;
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.status !== undefined) {
      updates.push(`status = $${paramIndex}`);
      values.push(data.status);
      paramIndex++;
    }
    if (data.paymentStatus !== undefined) {
      updates.push(`payment_status = $${paramIndex}`);
      values.push(data.paymentStatus);
      paramIndex++;
    }
    if (data.amountPaid !== undefined) {
      updates.push(`amount_paid = $${paramIndex}`);
      values.push(data.amountPaid);
      paramIndex++;
    }
    if (data.checkInAt !== undefined) {
      updates.push(`check_in_at = $${paramIndex}`);
      values.push(data.checkInAt);
      paramIndex++;
    }
    if (data.checkOutAt !== undefined) {
      updates.push(`check_out_at = $${paramIndex}`);
      values.push(data.checkOutAt);
      paramIndex++;
    }
    if (data.cancelledAt !== undefined) {
      updates.push(`cancelled_at = $${paramIndex}`);
      values.push(data.cancelledAt);
      paramIndex++;
    }
    if (data.nights !== undefined) {
      updates.push(`nights = $${paramIndex}`);
      values.push(data.nights);
      paramIndex++;
    }
    if (data.departureDate !== undefined) {
      updates.push(`departure_date = $${paramIndex}`);
      values.push(data.departureDate);
      paramIndex++;
    }
    if (data.totalPrice !== undefined) {
      updates.push(`total_price = $${paramIndex}`);
      values.push(data.totalPrice);
      paramIndex++;
    }
    if (data.pricingPerNight !== undefined) {
      updates.push(`pricing_per_night = $${paramIndex}`);
      values.push(data.pricingPerNight);
      paramIndex++;
    }
    if (data.pricingAddons !== undefined) {
      updates.push(`pricing_addons = $${paramIndex}`);
      values.push(data.pricingAddons);
      paramIndex++;
    }
    if (data.pricingSubtotal !== undefined) {
      updates.push(`pricing_subtotal = $${paramIndex}`);
      values.push(data.pricingSubtotal);
      paramIndex++;
    }
    if (data.pricingTaxes !== undefined) {
      updates.push(`pricing_taxes = $${paramIndex}`);
      values.push(data.pricingTaxes);
      paramIndex++;
    }
    if (data.pricingTotal !== undefined) {
      updates.push(`pricing_total = $${paramIndex}`);
      values.push(data.pricingTotal);
      paramIndex++;
    }
    if (data.metadata !== undefined) {
      updates.push(`metadata = $${paramIndex}`);
      values.push(data.metadata);
      paramIndex++;
    }

    updates.push(`updated_at = now()`);
    values.push(id);

    if (updates.length === 1) {
      const booking = await this.findById(id, client);
      if (!booking) throw new Error("Booking not found");
      return booking;
    }

    const result = await db.query(
      `UPDATE bookings SET ${updates.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
      values,
    );
    if (!result.rows[0]) throw new Error("Booking not found");
    return mapRowToBooking(result.rows[0]);
  },

  async findByIdAndDelete(id: string, client?: PoolClient): Promise<void> {
    const db = client || pool;
    await db.query("DELETE FROM bookings WHERE id = $1", [id]);
  },

  async exists(where: any, client?: PoolClient): Promise<boolean> {
    const db = client || pool;
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (where.roomId) {
      conditions.push(`room_id = $${paramIndex}`);
      values.push(where.roomId);
      paramIndex++;
    }
    if (where.status) {
      if (Array.isArray(where.status)) {
        conditions.push(`status = ANY($${paramIndex}::booking_status[])`);
        values.push(where.status);
      } else {
        conditions.push(`status = $${paramIndex}`);
        values.push(where.status);
      }
      paramIndex++;
    }

    if (conditions.length === 0) return false;

    const query = `SELECT EXISTS(SELECT 1 FROM bookings WHERE ${conditions.join(" AND ")})`;
    const result = await db.query(query, values);
    return result.rows[0].exists;
  },

  async findOneWithClient(client: PoolClient, where: any): Promise<BookingRow | null> {
    return BookingModel.findOne(where, client);
  },

  async createWithClient(client: PoolClient, data: CreateBookingInput): Promise<BookingRow> {
    return BookingModel.create(data, client);
  },

  async updateWithClient(client: PoolClient, id: string, data: Partial<BookingRow>): Promise<BookingRow> {
    return BookingModel.update(id, data, client);
  },
};
