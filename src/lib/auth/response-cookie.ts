export function withAuthCookie(response: Response, accessToken?: string) {
  const token = accessToken?.trim();
  if (!token) {
    return response;
  }

  const isSecure = process.env.NODE_ENV === "production";
  const cookie = [
    `hotel_saas_token=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${60 * 60 * 24 * 7}`,
    isSecure ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");

  response.headers.append("Set-Cookie", cookie);
  return response;
}

export function clearAuthCookie(response: Response) {
  const isSecure = process.env.NODE_ENV === "production";
  const cookie = [
    "hotel_saas_token=",
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
    isSecure ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");

  response.headers.append("Set-Cookie", cookie);
  return response;
}
