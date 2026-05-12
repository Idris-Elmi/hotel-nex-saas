import bcrypt from "bcryptjs";
import { ValidationError } from "@/lib/errors";
import { signAccessToken, verifyAccessToken } from "@/lib/auth/jwt";
import { UserModel } from "@/models/user.model";
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
    if (input.role === "CUSTOMER" && !existing.passwordHash) {
      const passwordHash = await bcrypt.hash(input.password, 10);
      const updated = await UserModel.update(existing.id, {
        passwordHash,
        name: input.name,
        phone: input.phone ?? existing.phone,
        role: "CUSTOMER",
        provider: "local",
        providerId: email,
        passportDocumentUrl: input.passportDocumentUrl ?? existing.passportDocumentUrl ?? "/uploads/ids/placeholder.jpg",
        privacyAcceptedAt: existing.privacyAcceptedAt ?? new Date(),
      });

      const token = signAccessToken({
        sub: updated.id,
        role: coerceRole(updated.role),
        email: updated.email,
      });

      return {
        accessToken: token,
        user: {
          id: updated.id,
          name: updated.name,
          email: updated.email,
          role: updated.role,
          phone: updated.phone,
          passportDocumentUrl: updated.passportDocumentUrl,
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
      (error as { code?: string }).code === "23505"
    ) {
      throw new ValidationError("Email is already registered");
    }
    throw error;
  }

  const token = signAccessToken({
    sub: user.id,
    role: coerceRole(user.role),
    email: user.email,
  });

  return {
    accessToken: token,
    user: {
      id: user.id,
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
    sub: user.id,
    role: coerceRole(user.role),
    email: user.email,
  });

  return {
    accessToken: token,
    user: {
      id: user.id,
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
  const user = await UserModel.findById(claims.sub);
  if (!user) {
    throw new ValidationError("User not found for token");
  }

  return {
    claims,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: coerceRole(user.role),
      phone: user.phone,
      passportDocumentUrl: user.passportDocumentUrl,
    },
  };
}
