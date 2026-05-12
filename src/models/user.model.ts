import { PoolClient } from "pg";
import pool from "@/lib/db/postgres";
import type { CreateUserInput, UserRow } from "./types";

function mapRowToUser(row: any): UserRow {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    name: row.name,
    role: row.role,
    phone: row.phone,
    provider: row.provider,
    providerId: row.provider_id,
    identityType: row.identity_type,
    passportDocumentUrl: row.passport_document_url,
    privacyAcceptedAt: row.privacy_accepted_at,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const UserModel = {
  async findById(id: string, client?: PoolClient): Promise<UserRow | null> {
    const db = client || pool;
    const result = await db.query("SELECT * FROM users WHERE id = $1", [id]);
    return result.rows[0] ? mapRowToUser(result.rows[0]) : null;
  },

  async findOne(
    where: { email?: string; providerId?: string },
    client?: PoolClient,
  ): Promise<UserRow | null> {
    const db = client || pool;
    if (where.email) {
      const result = await db.query("SELECT * FROM users WHERE email = $1", [where.email]);
      return result.rows[0] ? mapRowToUser(result.rows[0]) : null;
    }
    if (where.providerId) {
      const result = await db.query("SELECT * FROM users WHERE provider_id = $1", [where.providerId]);
      return result.rows[0] ? mapRowToUser(result.rows[0]) : null;
    }
    return null;
  },

  async create(data: CreateUserInput, client?: PoolClient): Promise<UserRow> {
    const db = client || pool;
    const result = await db.query(
      `INSERT INTO users (email, password_hash, name, role, phone, provider, provider_id, identity_type, passport_document_url, privacy_accepted_at, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        data.email,
        data.passwordHash || null,
        data.name,
        data.role || "CUSTOMER",
        data.phone || null,
        data.provider || "local",
        data.providerId || null,
        data.identityType || "passport",
        data.passportDocumentUrl || null,
        data.privacyAcceptedAt || null,
        data.isActive !== false,
      ],
    );
    return mapRowToUser(result.rows[0]);
  },

  async update(id: string, data: Partial<UserRow>, client?: PoolClient): Promise<UserRow> {
    const db = client || pool;
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.passwordHash !== undefined) {
      updates.push(`password_hash = $${paramIndex}`);
      values.push(data.passwordHash);
      paramIndex++;
    }
    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      values.push(data.name);
      paramIndex++;
    }
    if (data.phone !== undefined) {
      updates.push(`phone = $${paramIndex}`);
      values.push(data.phone);
      paramIndex++;
    }
    if (data.role !== undefined) {
      updates.push(`role = $${paramIndex}`);
      values.push(data.role);
      paramIndex++;
    }
    if (data.provider !== undefined) {
      updates.push(`provider = $${paramIndex}`);
      values.push(data.provider);
      paramIndex++;
    }
    if (data.providerId !== undefined) {
      updates.push(`provider_id = $${paramIndex}`);
      values.push(data.providerId);
      paramIndex++;
    }
    if (data.passportDocumentUrl !== undefined) {
      updates.push(`passport_document_url = $${paramIndex}`);
      values.push(data.passportDocumentUrl);
      paramIndex++;
    }
    if (data.privacyAcceptedAt !== undefined) {
      updates.push(`privacy_accepted_at = $${paramIndex}`);
      values.push(data.privacyAcceptedAt);
      paramIndex++;
    }
    if (data.isActive !== undefined) {
      updates.push(`is_active = $${paramIndex}`);
      values.push(data.isActive);
      paramIndex++;
    }

    updates.push(`updated_at = now()`);
    values.push(id);

    if (updates.length === 1) {
      const user = await this.findById(id, client);
      if (!user) throw new Error("User not found");
      return user;
    }

    const result = await db.query(
      `UPDATE users SET ${updates.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
      values,
    );
    if (!result.rows[0]) throw new Error("User not found");
    return mapRowToUser(result.rows[0]);
  },
};
