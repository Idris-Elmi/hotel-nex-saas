import { PoolClient } from "pg";
import pool from "@/lib/db/postgres";
import { RoomTypeModel } from "./room-type.model";
import type { CreateRoomInput, RoomRow } from "./types";

function mapRowToRoom(row: any): RoomRow {
  const room: RoomRow = {
    id: row.id,
    roomNumber: row.room_number,
    typeId: row.type_id,
    pricePerNight: parseFloat(row.price_per_night),
    capacity: row.capacity,
    images: row.images || [],
    status: row.status,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  if (row.type_name) {
    room.type = {
      id: row.type_id,
      name: row.type_name,
      code: row.type_code,
      description: row.type_description,
      breakfastAddonPrice: parseFloat(row.type_breakfast_addon_price || 0),
      isActive: row.type_is_active,
      createdAt: row.type_created_at,
      updatedAt: row.type_updated_at,
    };
  }

  return room;
}

export const RoomModel = {
  async findById(id: string, options?: { populate?: boolean }, client?: PoolClient): Promise<RoomRow | null> {
    const db = client || pool;
    if (options?.populate) {
      const result = await db.query(
        `SELECT r.*, rt.name as type_name, rt.code as type_code, rt.description as type_description,
                rt.breakfast_addon_price as type_breakfast_addon_price, rt.is_active as type_is_active,
                rt.created_at as type_created_at, rt.updated_at as type_updated_at
         FROM rooms r
         LEFT JOIN room_types rt ON r.type_id = rt.id
         WHERE r.id = $1`,
        [id],
      );
      return result.rows[0] ? mapRowToRoom(result.rows[0]) : null;
    }
    const result = await db.query("SELECT * FROM rooms WHERE id = $1", [id]);
    return result.rows[0] ? mapRowToRoom(result.rows[0]) : null;
  },

  async findOne(where: { roomNumber?: string }, options?: { caseInsensitive?: boolean }, client?: PoolClient): Promise<RoomRow | null> {
    const db = client || pool;
    if (where.roomNumber) {
      const query = options?.caseInsensitive
        ? "SELECT * FROM rooms WHERE LOWER(room_number) = LOWER($1)"
        : "SELECT * FROM rooms WHERE room_number = $1";
      const result = await db.query(query, [where.roomNumber]);
      return result.rows[0] ? mapRowToRoom(result.rows[0]) : null;
    }
    return null;
  },

  async find(filter?: any, options?: { sort?: string; populate?: boolean }, client?: PoolClient): Promise<RoomRow[]> {
    const db = client || pool;
    let query = "SELECT ";

    if (options?.populate) {
      query +=
        `r.*, rt.name as type_name, rt.code as type_code, rt.description as type_description,
        rt.breakfast_addon_price as type_breakfast_addon_price, rt.is_active as type_is_active,
        rt.created_at as type_created_at, rt.updated_at as type_updated_at
     FROM rooms r
     LEFT JOIN room_types rt ON r.type_id = rt.id`;
    } else {
      query += "* FROM rooms r";
    }

    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (filter?.isActive !== undefined) {
      conditions.push(`r.is_active = $${paramIndex}`);
      values.push(filter.isActive);
      paramIndex++;
    }
    if (filter?.status !== undefined) {
      conditions.push(`r.status = $${paramIndex}`);
      values.push(filter.status);
      paramIndex++;
    }
    if (filter?.capacity !== undefined) {
      conditions.push(`r.capacity >= $${paramIndex}`);
      values.push(filter.capacity);
      paramIndex++;
    }
    if (filter?._id) {
      conditions.push(`r.id != ALL($${paramIndex}::uuid[])`);
      values.push(filter._id);
      paramIndex++;
    }
    if (filter?._nin) {
      conditions.push(`r.id != ALL($${paramIndex}::uuid[])`);
      values.push(filter._nin);
      paramIndex++;
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    const sort = options?.sort || "r.room_number ASC";
    query += ` ORDER BY ${sort}`;

    const result = await db.query(query, values);
    return result.rows.map(mapRowToRoom);
  },

  async create(data: CreateRoomInput, client?: PoolClient): Promise<RoomRow> {
    const db = client || pool;
    const result = await db.query(
      `INSERT INTO rooms (room_number, type_id, price_per_night, capacity, images, status, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        data.roomNumber,
        data.typeId,
        data.pricePerNight,
        data.capacity,
        data.images || [],
        data.status || "AVAILABLE",
        data.isActive !== false,
      ],
    );
    return mapRowToRoom(result.rows[0]);
  },

  async findByIdAndUpdate(id: string, data: Partial<RoomRow>, options?: { populate?: boolean }, client?: PoolClient): Promise<RoomRow | null> {
    const db = client || pool;
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.roomNumber !== undefined) {
      updates.push(`room_number = $${paramIndex}`);
      values.push(data.roomNumber);
      paramIndex++;
    }
    if (data.typeId !== undefined) {
      updates.push(`type_id = $${paramIndex}`);
      values.push(data.typeId);
      paramIndex++;
    }
    if (data.pricePerNight !== undefined) {
      updates.push(`price_per_night = $${paramIndex}`);
      values.push(data.pricePerNight);
      paramIndex++;
    }
    if (data.capacity !== undefined) {
      updates.push(`capacity = $${paramIndex}`);
      values.push(data.capacity);
      paramIndex++;
    }
    if (data.images !== undefined) {
      updates.push(`images = $${paramIndex}`);
      values.push(data.images);
      paramIndex++;
    }
    if (data.status !== undefined) {
      updates.push(`status = $${paramIndex}`);
      values.push(data.status);
      paramIndex++;
    }
    if (data.isActive !== undefined) {
      updates.push(`is_active = $${paramIndex}`);
      values.push(data.isActive);
      paramIndex++;
    }

    if (updates.length === 0) {
      return this.findById(id, options, client);
    }

    updates.push(`updated_at = now()`);
    values.push(id);

    let query = "UPDATE rooms SET " + updates.join(", ");
    if (options?.populate) {
      query = `WITH updated AS (${query} RETURNING *)
               SELECT u.*, rt.name as type_name, rt.code as type_code, rt.description as type_description,
                      rt.breakfast_addon_price as type_breakfast_addon_price, rt.is_active as type_is_active,
                      rt.created_at as type_created_at, rt.updated_at as type_updated_at
               FROM updated u
               LEFT JOIN room_types rt ON u.type_id = rt.id`;
    } else {
      query += ` WHERE id = $${paramIndex} RETURNING *`;
    }

    const result = await db.query(query, values);
    return result.rows[0] ? mapRowToRoom(result.rows[0]) : null;
  },

  async findByIdAndDelete(id: string, client?: PoolClient): Promise<void> {
    const db = client || pool;
    await db.query("DELETE FROM rooms WHERE id = $1", [id]);
  },

  async reserveIfAvailable(id: string, client?: PoolClient): Promise<RoomRow | null> {
    const db = client || pool;
    const result = await db.query(
      `UPDATE rooms SET status = 'RESERVED', updated_at = now()
       WHERE id = $1 AND status = 'AVAILABLE' AND is_active = true
       RETURNING *`,
      [id],
    );
    return result.rows[0] ? mapRowToRoom(result.rows[0]) : null;
  },

  async countDocuments(filter?: { isActive?: boolean }, client?: PoolClient): Promise<number> {
    const db = client || pool;
    let query = "SELECT COUNT(*) as count FROM rooms";
    const values: any[] = [];

    if (filter?.isActive !== undefined) {
      query += " WHERE is_active = $1";
      values.push(filter.isActive);
    }

    const result = await db.query(query, values);
    return parseInt(result.rows[0].count, 10);
  },
};
