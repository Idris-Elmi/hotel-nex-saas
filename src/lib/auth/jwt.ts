import jwt from "jsonwebtoken";
import { appConfig } from "@/lib/config";
import { UnauthorizedError } from "@/lib/errors";
import type { SignOptions } from "jsonwebtoken";

export type JwtRole = "OWNER" | "ADMIN" | "RECEPTIONIST" | "CUSTOMER";

export type JwtClaims = {
  sub: string;
  role: JwtRole;
  email: string;
};

export function signAccessToken(claims: JwtClaims): string {
  const options: SignOptions = {
    expiresIn: appConfig.jwtExpiresIn as SignOptions["expiresIn"],
  };

  return jwt.sign(claims, appConfig.jwtSecret, {
    ...options,
  });
}

export function verifyAccessToken(token: string): JwtClaims {
  try {
    return jwt.verify(token, appConfig.jwtSecret) as JwtClaims;
  } catch {
    throw new UnauthorizedError("Invalid or expired token");
  }
}

export function parseBearerToken(authHeader: string | null): string {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new UnauthorizedError("Missing bearer token");
  }
  return authHeader.slice(7);
}
