import { setDefaultResultOrder } from "dns";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Facebook from "next-auth/providers/facebook";
import type { GoogleProfile } from "next-auth/providers/google";
import type { FacebookProfile } from "next-auth/providers/facebook";
import type { OAuthConfig } from "next-auth/providers/oauth";
import { connectDb } from "@/lib/db/mongoose";
import { UserModel } from "@/models/User";

type AppRouteHandler = (
  req: Request,
  context: { params: Promise<Record<string, string | string[]>> },
) => Promise<Response>;

type OAuthUser = {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string;
};

let _handler: AppRouteHandler | undefined;

const OAUTH_HTTP_TIMEOUT_MS = Number(process.env.OAUTH_HTTP_TIMEOUT ?? 120000);
const OAUTH_HTTP_OPTIONS = { timeout: OAUTH_HTTP_TIMEOUT_MS };

setDefaultResultOrder("ipv4first");

function init() {
  if (_handler) return;

  const providers: OAuthConfig<GoogleProfile & FacebookProfile>[] = [];

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    providers.push(
      Google({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        httpOptions: OAUTH_HTTP_OPTIONS,
      }),
    );
  }

  if (process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET) {
    providers.push(
      Facebook({
        clientId: process.env.FACEBOOK_CLIENT_ID,
        clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
        httpOptions: OAUTH_HTTP_OPTIONS,
      }),
    );
  }

  _handler = NextAuth({
    session: { strategy: "jwt" },
    secret: process.env.NEXTAUTH_SECRET,
    providers,
    callbacks: {
      async signIn({ user, account }) {
        const email = user?.email?.toLowerCase();
        if (!email) {
          return true;
        }

        try {
          await connectDb();

          let dbUser = await UserModel.findOne({ email });
          if (!dbUser) {
            dbUser = await UserModel.create({
              email,
              name: user.name ?? email.split("@")[0],
              image: user.image ?? undefined,
              role: "CUSTOMER",
              provider: account?.provider === "facebook" ? "facebook" : "google",
              providerId: email,
              privacyAcceptedAt: new Date(),
            });
          }

          user.id = String(dbUser._id);
          (user as OAuthUser).role = "CUSTOMER";
        } catch {
          // Never block the OAuth handshake because of a database hiccup.
        }

        return true;
      },

      async jwt({ token, user }) {
        if (user?.email) {
          if (user.id) {
            token.id = user.id;
            token.role = (user as OAuthUser).role ?? "CUSTOMER";
          } else if (!token.id) {
            try {
              await connectDb();
              const dbUser = await UserModel.findOne({ email: user.email.toLowerCase() });
              if (dbUser) {
                token.id = String(dbUser._id);
                token.role = dbUser.role ?? "CUSTOMER";
              }
            } catch {
              // The booking exchange flow re-resolves the user if the session id is missing.
            }
          }
        }

        return token;
      },

      async session({ session, token }) {
        if (session?.user && token?.id) {
          (session.user as OAuthUser).id = String(token.id);
          (session.user as OAuthUser).role = (token.role as string) ?? "CUSTOMER";
        }

        return session;
      },
    },
  }) as unknown as AppRouteHandler;
}

export function getHandler(): AppRouteHandler {
  init();
  return _handler!;
}
