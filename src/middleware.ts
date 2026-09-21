import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

type TokenPayload = {
  exp?: number;
  role?: string;
};

function parseJwtPayload(token: string | undefined): TokenPayload | null {
  if (!token) {
    return null;
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }

  try {
    const payloadText = atob(parts[1]);
    return JSON.parse(payloadText) as TokenPayload;
  } catch {
    return null;
  }
}

function isJwtLikelyValid(token: string | undefined) {
  const payload = parseJwtPayload(token);
  if (!payload) {
    return false;
  }

  if (typeof payload.exp !== "number") {
    return true;
  }

  const now = Math.floor(Date.now() / 1000);
  return payload.exp > now;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isBookingPath = pathname === "/booking/detail" || pathname === "/booking/details" || pathname.startsWith("/booking/");
  const isAdminPath = pathname.startsWith("/admin/") || pathname === "/admin";
  const isReceptionPath = pathname.startsWith("/reception/") || pathname === "/reception";
  const isOwnerPath = pathname.startsWith("/owner/") || pathname === "/owner";
  const isStaffPath = isAdminPath || isReceptionPath || isOwnerPath;
  const isCustomerPath = pathname.startsWith("/customer/") || pathname === "/customer";

  const token = req.cookies.get("hotel_saas_token")?.value;

  if (isStaffPath) {
    if (!isJwtLikelyValid(token)) {
      const signInUrl = new URL("/auth/staff-signin", req.url);
      signInUrl.searchParams.set("redirectTo", pathname);
      return NextResponse.redirect(signInUrl);
    }

    const payload = parseJwtPayload(token);
    const role = payload?.role;
    const isAdminRole = role === "ADMIN";
    const isReceptionRole = role === "RECEPTIONIST";

    if (isAdminPath && !isAdminRole) {
      return NextResponse.redirect(new URL("/auth/staff-signin", req.url));
    }

    if (isReceptionPath && !isAdminRole && !isReceptionRole) {
      return NextResponse.redirect(new URL("/auth/staff-signin", req.url));
    }

    if (isOwnerPath && role !== "OWNER") {
      return NextResponse.redirect(new URL("/auth/staff-signin", req.url));
    }
  }

  if (isCustomerPath) {
    if (!isJwtLikelyValid(token)) {
      const signInUrl = new URL("/auth/customer-signin", req.url);
      signInUrl.searchParams.set("redirectTo", pathname);
      return NextResponse.redirect(signInUrl);
    }

    const payload = parseJwtPayload(token);
    if (payload?.role !== "CUSTOMER") {
      return NextResponse.redirect(new URL("/auth/customer-signin", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/booking/:path*", "/booking/detail", "/booking/details", "/admin/:path*", "/reception/:path*", "/owner/:path*", "/customer/:path*", "/customer"],
};
