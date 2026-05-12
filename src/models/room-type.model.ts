import { PoolClient } from "pg";
import pool from "@/lib/db/postgres";
import type { CreateRoomTypeInput, RoomTypeRow } from "./types";

function mapRowToRoomType(row: any): RoomTypeRow {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    description: row.description,
    breakfastAddonPrice: parseFloat(row.breakfast_addon_price),
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const RoomTypeModel = {
  async findById(id: string, client?: PoolClient): Promise<RoomTypeRow | null> {
    const db = client || pool;
    const result = await db.query("SELECT * FROM room_types WHERE id = $1", [id]);
    return result.rows[0] ? mapRowToRoomType(result.rows[0]) : null;
  },

  async find(options?: { sort?: string }, client?: PoolClient): Promise<RoomTypeRow[]> {
    const db = client || pool;
    const sort = options?.sort || "name ASC";
    const result = await db.query(`SELECT * FROM room_types ORDER BY ${sort}`);
    return result.rows.map(mapRowToRoomType);
  },

  async create(data: CreateRoomTypeInput, client?: PoolClient): Promise<RoomTypeRow> {
    const db = client || pool;
    const result = await db.query(
      `INSERT INTO room_types (name, code, description, breakfast_addon_price, is_active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        data.name,
        data.code?.toUpperCase(),
        data.description || "",
        data.breakfastAddonPrice || 0,
        data.isActive !== false,
      ],
    );
    return mapRowToRoomType(result.rows[0]);
  },

  async findByIdAndUpdate(id: string, data: Partial<RoomTypeRow>, client?: PoolClient): Promise<RoomTypeRow | null> {
    const db = client || pool;
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      values.push(data.name);
      paramIndex++;
    }
    if (data.code !== undefined) {
      updates.push(`code = $${paramIndex}`);
      values.push(data.code?.toUpperCase());
      paramIndex++;
    }
    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      values.push(data.description);
      paramIndex++;
    }
    if (data.breakfastAddonPrice !== undefined) {
      updates.push(`breakfast_addon_price = $${paramIndex}`);
      values.push(data.breakfastAddonPrice);
      paramIndex++;
    }
    if (data.isActive !== undefined) {
      updates.push(`is_active = $${paramIndex}`);
      values.push(data.isActive);
      paramIndex++;
    }

    if (updates.length === 0) {
      return this.findById(id, client);
    }

    updates.push(`updated_at = now()`);
    values.push(id);

    const result = await db.query(
      `UPDATE room_types SET ${updates.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
      values,
    );
    return result.rows[0] ? mapRowToRoomType(result.rows[0]) : null;
  },

  async findByIdAndDelete(id: string, client?: PoolClient): Promise<void> {
    const db = client || pool;
    await db.query("DELETE FROM room_types WHERE id = $1", [id]);
  },
};
