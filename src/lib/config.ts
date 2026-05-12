export const appConfig = {
  jwtSecret: process.env.JWT_SECRET ?? "dev-jwt-secret-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "15m",
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
