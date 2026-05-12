import { Pool } from "pg";

declare global {
  var pgPool: Pool | undefined;
}

const pool = global.pgPool ?? new Pool({
  connectionString: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/hotel_saas",
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

if (process.env.NODE_ENV !== "production") {
  global.pgPool = pool;
}

export default pool;
export type { PoolClient } from "pg";
