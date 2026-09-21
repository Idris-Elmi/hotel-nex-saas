import { getServerSession } from "next-auth";
import { connectDb } from "@/lib/db/mongoose";
import { UserModel } from "@/models/User";
import { signAccessToken } from "@/lib/auth/jwt";
import { UnauthorizedError } from "@/lib/errors";
import { ok, fail } from "@/lib/http";
import { withAuthCookie } from "@/lib/auth/response-cookie";

export async function POST() {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      throw new UnauthorizedError("Not authenticated");
    }

    await connectDb();

    const email = session.user.email.toLowerCase();
    const name = session.user.name ?? email.split("@")[0];

    let user = await UserModel.findOne({ email });

    if (!user) {
      user = await UserModel.create({
        email,
        name,
        role: "CUSTOMER",
        provider: "google",
        providerId: email,
        privacyAcceptedAt: new Date(),
      });
    }

    const token = signAccessToken({
      sub: String(user._id),
      role: "CUSTOMER",
      email: user.email,
    });

    return withAuthCookie(ok({ accessToken: token }), token);
  } catch (error) {
    return fail(error);
  }
}
