"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const BOOKING_KEYS = [
  "roomId",
  "arrivalDate",
  "nights",
  "adults",
  "children",
  "pricingPlan",
  "firstName",
  "lastName",
  "fullName",
  "email",
  "phone",
  "address",
  "identityDocumentUrl",
] as const;

type AuthPayload = {
  accessToken?: string;
  user?: {
    id?: string;
    role?: "ADMIN" | "RECEPTIONIST" | "CUSTOMER";
  };
  message?: string;
};

export function BookingCustomerAuthStep() {
  const router = useRouter();
  const params = useSearchParams();

  const [createUsername, setCreateUsername] = useState(params.get("email") ?? "");
  const [createPassword, setCreatePassword] = useState("");
  const [createConfirmPassword, setCreateConfirmPassword] = useState("");

  const [loading, setLoading] = useState<"" | "register" | "prepare-login">("");
  const [error, setError] = useState("");

  const guestInfo = useMemo(() => {
    const fromSession = sessionStorage.getItem("booking_guest_info");
    if (fromSession) {
      try {
        return JSON.parse(fromSession) as {
          firstName?: string;
          lastName?: string;
          fullName?: string;
          email?: string;
          phone?: string;
          address?: string;
          passportDocumentUrl?: string;
        };
      } catch {
        // ignore broken session content
      }
    }

    const firstName = params.get("firstName") ?? "";
    const lastName = params.get("lastName") ?? "";
    return {
      firstName,
      lastName,
      fullName: params.get("fullName") ?? `${firstName} ${lastName}`.trim(),
      email: params.get("email") ?? "",
      phone: params.get("phone") ?? "",
      address: params.get("address") ?? "",
      passportDocumentUrl: params.get("identityDocumentUrl") ?? "",
    };
  }, [params]);

  const bookingPayload = useMemo(() => {
    const adults = Number(params.get("adults") ?? "2");
    const children = Number(params.get("children") ?? "0");

    return {
      roomId: params.get("roomId") ?? "",
      arrivalDate: params.get("arrivalDate") ?? "",
      nights: Number(params.get("nights") ?? "1"),
      pricingPlan: (params.get("pricingPlan") ?? "BED_ONLY") as "BED_ONLY" | "BED_BREAKFAST",
      guests: {
        adults: Number.isFinite(adults) && adults > 0 ? adults : 2,
        children: Number.isFinite(children) && children >= 0 ? children : 0,
      },
      guest: {
        fullName: guestInfo.fullName ?? "",
        email: guestInfo.email ?? "",
        phone: guestInfo.phone ?? "",
        identityDocumentUrl: guestInfo.passportDocumentUrl ?? "/uploads/ids/placeholder.jpg",
        privacyAccepted: true,
      },
    };
  }, [guestInfo, params]);

  const socialCallbackUrl = useMemo(() => {
    const next = new URLSearchParams();
    for (const key of BOOKING_KEYS) {
      const value = params.get(key);
      if (value) {
        next.set(key, value);
      }
    }

    const query = next.toString();
    return `/booking/customer-auth${query ? `?${query}` : ""}`;
  }, [params]);

  async function handleAuthSuccess(payload: AuthPayload) {
    const token = payload.accessToken?.trim() ?? "";
    if (!token) {
      setError("Authentication succeeded but no token was returned.");
      return;
    }

    const role = payload.user?.role;
    if (role !== "CUSTOMER") {
      setError("Please use a customer account for booking payment.");
      return;
    }

    localStorage.setItem("hotel_saas_token", token);

    const bookingResponse = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...bookingPayload,
        userId: payload.user?.id,
        idempotencyKey: crypto.randomUUID(),
      }),
    });

    const bookingData = await bookingResponse.json().catch(() => ({}));
    if (!bookingResponse.ok || !bookingData?.booking?._id) {
      setError(bookingData.message ?? "Account created, but booking reservation failed. Please try again.");
      return;
    }

    const bookingId = String(bookingData.booking._id);
    sessionStorage.setItem("booking_progress_booking_id", bookingId);
    sessionStorage.setItem("booking_progress_continue_payment", "1");
    router.push(`/booking/payment?bookingId=${encodeURIComponent(bookingId)}`);
  }

  async function prepareAndRedirectToCustomerSignIn() {
    setError("");
    setLoading("prepare-login");

    const idempotencyKey = sessionStorage.getItem("booking_progress_idempotency") ?? crypto.randomUUID();
    sessionStorage.setItem("booking_progress_idempotency", idempotencyKey);

    const bookingResponse = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...bookingPayload,
        idempotencyKey,
      }),
    });

    const bookingData = await bookingResponse.json().catch(() => ({}));
    setLoading("");

    if (!bookingResponse.ok || !bookingData?.booking?._id) {
      setError(bookingData.message ?? "Failed to save booking progress before sign-in.");
      return;
    }

    const bookingId = String(bookingData.booking._id);
    sessionStorage.setItem("booking_progress_booking_id", bookingId);
    sessionStorage.setItem("booking_progress_continue_payment", "1");

    router.push("/auth/customer-signin?redirectTo=%2Fcustomer%2Fdashboard");
  }

  async function submitRegister(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!createUsername.trim() || !createPassword || !createConfirmPassword) {
      setError("Fill all Create Account fields.");
      return;
    }

    if (createPassword !== createConfirmPassword) {
      setError("Password and Confirm Password must match.");
      return;
    }

    setLoading("register");
    const response = await fetch("/api/auth/customer/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: guestInfo.fullName ?? `${guestInfo.firstName ?? ""} ${guestInfo.lastName ?? ""}`.trim(),
        email: createUsername.trim(),
        phone: guestInfo.phone,
        password: createPassword,
        passportDocumentUrl: guestInfo.passportDocumentUrl,
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as AuthPayload;
    setLoading("");

    if (!response.ok) {
      setError(payload.message ?? "Registration failed");
      return;
    }

    await handleAuthSuccess(payload);
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-3xl font-black text-slate-900">Step 4: Account Setup / Authentication</h1>
      <p className="mt-2 text-slate-600">Create account, use social sign-in, or sign in as existing user. Any successful option continues booking flow immediately.</p>

      {error ? <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <form onSubmit={submitRegister} className="grid gap-3 rounded-xl border border-slate-200 p-4">
          <h2 className="text-lg font-bold text-slate-900">Option A: Create Account (Manual)</h2>

          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            Username / Email
            <input
              className="rounded-lg border border-slate-300 px-3 py-2"
              type="email"
              value={createUsername}
              onChange={(e) => setCreateUsername(e.target.value)}
              required
            />
          </label>

          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            Password
            <input
              className="rounded-lg border border-slate-300 px-3 py-2"
              type="password"
              value={createPassword}
              onChange={(e) => setCreatePassword(e.target.value)}
              required
            />
          </label>

          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            Confirm Password
            <input
              className="rounded-lg border border-slate-300 px-3 py-2"
              type="password"
              value={createConfirmPassword}
              onChange={(e) => setCreateConfirmPassword(e.target.value)}
              required
            />
          </label>

          <button className="mt-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" type="submit" disabled={loading === "register"}>
            {loading === "register" ? "Creating account..." : "Create Account & Continue"}
          </button>
        </form>

        <div className="grid gap-3 rounded-xl border border-slate-200 p-4">
          <h2 className="text-lg font-bold text-slate-900">Option C: Existing User Sign-In</h2>

          <p className="text-sm text-slate-600">Click below to go to customer sign-in. After successful login, you will be redirected to customer dashboard and continue payment there.</p>

          <button
            className="mt-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            type="button"
            onClick={prepareAndRedirectToCustomerSignIn}
            disabled={loading === "prepare-login"}
          >
            {loading === "prepare-login" ? "Preparing and redirecting..." : "Sign In & Continue"}
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h3 className="text-base font-bold text-slate-900">Option B: Social Sign-In</h3>
        <p className="mt-1 text-sm text-slate-600">Authenticate with Google or Facebook and continue booking flow.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100"
            href={`/api/auth/signin/google?callbackUrl=${encodeURIComponent(socialCallbackUrl)}`}
          >
            Continue with Google
          </a>
          <a
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100"
            href={`/api/auth/signin/facebook?callbackUrl=${encodeURIComponent(socialCallbackUrl)}`}
          >
            Continue with Facebook
          </a>
        </div>
      </div>
    </section>
  );
}
