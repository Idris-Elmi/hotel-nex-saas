import { ForbiddenError, UnauthorizedError } from "@/lib/errors";
import { parseBearerToken, verifyAccessToken, type JwtClaims, type JwtRole } from "@/lib/auth/jwt";

function getCookieValue(cookieHeader: string, name: string) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${escapedName}=([^;]+)`));
  if (!match) {
    return "";
  }

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

function extractAuthToken(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader) {
    try {
      return parseBearerToken(authHeader);
    } catch (error) {
      // Accept raw JWT token in Authorization header for compatibility with clients
      // that do not prefix the value with "Bearer ".
      if (error instanceof UnauthorizedError) {
        const rawToken = authHeader.trim();
        if (rawToken && !rawToken.includes(" ")) {
          return rawToken;
        }
      }
      throw error;
    }
  }

  const tokenHeader = req.headers.get("x-access-token") ?? req.headers.get("x-auth-token");
  if (tokenHeader?.trim()) {
    return tokenHeader.trim();
  }

  const cookieHeader = req.headers.get("cookie") ?? "";
  const cookieToken = getCookieValue(cookieHeader, "hotel_saas_token");
  if (cookieToken) {
    return cookieToken;
  }

  throw new UnauthorizedError("Missing bearer token");
}

export function authenticateRequest(req: Request): JwtClaims {
  const token = extractAuthToken(req);
  return verifyAccessToken(token);
}

export function authorize(req: Request, roles: JwtRole[]): JwtClaims {
  const claims = authenticateRequest(req);
  if (!roles.includes(claims.role)) {
    throw new ForbiddenError("Role is not allowed for this operation");
  }
  return claims;
}

export function optionalAuth(req: Request): JwtClaims | null {
  const header = req.headers.get("authorization");
  if (!header) {
    return null;
  }

  try {
    return authenticateRequest(req);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return null;
    }
    throw error;
  }
}
