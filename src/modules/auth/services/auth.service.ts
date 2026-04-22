import bcrypt from "bcryptjs";
import { ValidationError } from "@/lib/errors";
import { signAccessToken, verifyAccessToken } from "@/lib/auth/jwt";
import { UserModel } from "@/models/User";
import type { JwtRole } from "@/lib/auth/jwt";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function coerceRole(role: unknown): JwtRole {
  if (role === "ADMIN" || role === "RECEPTIONIST" || role === "CUSTOMER") {
    return role;
  }
  return "CUSTOMER";
}

export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
  role: JwtRole;
  passportDocumentUrl?: string;
  phone?: string;
}) {
  const email = normalizeEmail(input.email);
  const existing = await UserModel.findOne({ email });
  if (existing) {
    // If a customer record was pre-created during booking without credentials,
    // allow the user to complete account setup by setting a password.
    if (input.role === "CUSTOMER" && !existing.passwordHash) {
      existing.passwordHash = await bcrypt.hash(input.password, 10);
      existing.name = input.name;
      existing.phone = input.phone ?? existing.phone;
      existing.role = "CUSTOMER";
      existing.provider = "local";
      existing.providerId = email;
      existing.passportDocumentUrl = input.passportDocumentUrl ?? existing.passportDocumentUrl ?? "/uploads/ids/placeholder.jpg";
      existing.privacyAcceptedAt = existing.privacyAcceptedAt ?? new Date();
      await existing.save();

      const token = signAccessToken({
        sub: String(existing._id),
        role: coerceRole(existing.role),
        email: existing.email,
      });

      return {
        accessToken: token,
        user: {
          id: String(existing._id),
          name: existing.name,
          email: existing.email,
          role: existing.role,
          phone: existing.phone,
          passportDocumentUrl: existing.passportDocumentUrl,
        },
      };
    }

    throw new ValidationError("Email is already registered");
  }

  const passwordHash = await bcrypt.hash(input.password, 10);

  let user;
  try {
    user = await UserModel.create({
      name: input.name,
      email,
      passwordHash,
      role: input.role,
      phone: input.phone,
      provider: "local",
      providerId: email,
      passportDocumentUrl: input.passportDocumentUrl ?? "/uploads/ids/placeholder.jpg",
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: number }).code === 11000
    ) {
      throw new ValidationError("Email is already registered");
    }
    throw error;
  }

  const token = signAccessToken({
    sub: String(user._id),
    role: coerceRole(user.role),
    email: user.email,
  });

  return {
    accessToken: token,
    user: {
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      passportDocumentUrl: user.passportDocumentUrl,
    },
  };
}

export async function loginUser(input: { email: string; password: string }) {
  const user = await UserModel.findOne({ email: normalizeEmail(input.email) });
  if (!user || typeof user.passwordHash !== "string" || !user.passwordHash.trim()) {
    throw new ValidationError("Invalid credentials");
  }

  let valid = false;
  try {
    valid = await bcrypt.compare(input.password, user.passwordHash);
  } catch {
    throw new ValidationError("Invalid credentials");
  }

  if (!valid) {
    throw new ValidationError("Invalid credentials");
  }

  const token = signAccessToken({
    sub: String(user._id),
    role: coerceRole(user.role),
    email: user.email,
  });

  return {
    accessToken: token,
    user: {
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      passportDocumentUrl: user.passportDocumentUrl,
    },
  };
}

export async function verifyTokenAndGetUser(token: string) {
  const claims = verifyAccessToken(token);
  const user = await UserModel.findById(claims.sub).lean();
  if (!user) {
    throw new ValidationError("User not found for token");
  }

  return {
    claims,
    user: {
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: coerceRole(user.role),
      phone: user.phone,
      passportDocumentUrl: user.passportDocumentUrl,
    },
  };
}
