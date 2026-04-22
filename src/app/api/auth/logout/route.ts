import { clearAuthCookie } from "@/lib/auth/response-cookie";
import { ok } from "@/lib/http";

export async function POST() {
  const response = ok({ success: true, message: "Signed out" });
  return clearAuthCookie(response);
}
