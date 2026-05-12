import { PoolClient } from "pg";
import pool from "@/lib/db/postgres";
import type { CreatePaymentInput, PaymentRow } from "./types";

function mapRowToPayment(row: any): PaymentRow {
  return {
    id: row.id,
    bookingId: row.booking_id,
    userId: row.user_id,
    amount: parseFloat(row.amount),
    status: row.status,
    method: row.method,
    transactionReference: row.transaction_reference,
    idempotencyKey: row.idempotency_key,
    receiptUrl: row.receipt_url,
    rawPayload: row.raw_payload,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const PaymentModel = {
  async findById(id: string, client?: PoolClient): Promise<PaymentRow | null> {
    const db = client || pool;
    const result = await db.query("SELECT * FROM payments WHERE id = $1", [id]);
    return result.rows[0] ? mapRowToPayment(result.rows[0]) : null;
  },

  async find(filter?: any, options?: { sort?: string }, client?: PoolClient): Promise<PaymentRow[]> {
    const db = client || pool;
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (filter?.bookingId) {
      conditions.push(`booking_id = $${paramIndex}`);
      values.push(filter.bookingId);
      paramIndex++;
    }
    if (filter?.userId) {
      conditions.push(`user_id = $${paramIndex}`);
      values.push(filter.userId);
      paramIndex++;
    }
    if (filter?.status) {
      if (Array.isArray(filter.status)) {
        conditions.push(`status = ANY($${paramIndex}::payment_status[])`);
        values.push(filter.status);
      } else {
        conditions.push(`status = $${paramIndex}`);
        values.push(filter.status);
      }
      paramIndex++;
    }
    if (filter?.idempotencyKey) {
      conditions.push(`idempotency_key = $${paramIndex}`);
      values.push(filter.idempotencyKey);
      paramIndex++;
    }

    let query = "SELECT * FROM payments";
    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    const sort = options?.sort || "created_at DESC";
    query += ` ORDER BY ${sort}`;

    const result = await db.query(query, values);
    return result.rows.map(mapRowToPayment);
  },

  async create(data: CreatePaymentInput, client?: PoolClient): Promise<PaymentRow> {
    const db = client || pool;
    const result = await db.query(
      `INSERT INTO payments (booking_id, user_id, amount, status, method, transaction_reference, idempotency_key, receipt_url, raw_payload)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        data.bookingId,
        data.userId || null,
        data.amount,
        data.status,
        data.method,
        data.transactionReference || null,
        data.idempotencyKey || null,
        data.receiptUrl || null,
        data.rawPayload || null,
      ],
    );
    return mapRowToPayment(result.rows[0]);
  },

  async update(id: string, data: Partial<PaymentRow>, client?: PoolClient): Promise<PaymentRow> {
    const db = client || pool;
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.status !== undefined) {
      updates.push(`status = $${paramIndex}`);
      values.push(data.status);
      paramIndex++;
    }
    if (data.rawPayload !== undefined) {
      updates.push(`raw_payload = $${paramIndex}`);
      values.push(data.rawPayload);
      paramIndex++;
    }

    updates.push(`updated_at = now()`);
    values.push(id);

    if (updates.length === 1) {
      const payment = await this.findById(id, client);
      if (!payment) throw new Error("Payment not found");
      return payment;
    }

    const result = await db.query(
      `UPDATE payments SET ${updates.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
      values,
    );
    if (!result.rows[0]) throw new Error("Payment not found");
    return mapRowToPayment(result.rows[0]);
  },

  async deleteMany(filter: { bookingId: string }, client?: PoolClient): Promise<void> {
    const db = client || pool;
    await db.query("DELETE FROM payments WHERE booking_id = $1", [filter.bookingId]);
  },
};
