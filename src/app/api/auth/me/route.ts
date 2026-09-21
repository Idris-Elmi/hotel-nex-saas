import { connectDb } from "@/lib/db/mongoose";
import { fail, ok } from "@/lib/http";
import { parseBearerToken } from "@/lib/auth/jwt";
import { verifyTokenAndGetUser } from "@/modules/auth/services/auth.service";

export async function GET(req: Request) {
  try {
    await connectDb();
    const token = parseBearerToken(req.headers.get("authorization"));
    const data = await verifyTokenAndGetUser(token);
    return ok(data);
  } catch (error) {
    return fail(error);
  }
}
