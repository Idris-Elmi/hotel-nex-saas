export const appConfig = {
  jwtSecret: process.env.JWT_SECRET ?? "dev-jwt-secret-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "15m",
  mongoUri: process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/hotel_saas",
  mongoDbName: process.env.MONGODB_DB_NAME ?? "",
  uploadDir: process.env.UPLOAD_DIR ?? "public/uploads/ids",
  baseCurrency: process.env.BASE_CURRENCY ?? "USD",
};

export function requireConfig(key: keyof typeof appConfig): string {
  const value = appConfig[key];
  if (!value) {
    throw new Error(`Missing required config: ${key}`);
  }
  return value;
}
