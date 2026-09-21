import mongoose from "mongoose";
import { appConfig } from "@/lib/config";

declare global {
  var mongooseConn: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null } | undefined;
}

const cached = global.mongooseConn ?? { conn: null, promise: null };

if (!global.mongooseConn) {
  global.mongooseConn = cached;
}

export async function connectDb(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(appConfig.mongoUri, {
      ...(appConfig.mongoDbName ? { dbName: appConfig.mongoDbName } : {}),
      // Conservative defaults for API-style workload; tune with production telemetry.
      maxPoolSize: 20,
      minPoolSize: 0,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 30000,
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
