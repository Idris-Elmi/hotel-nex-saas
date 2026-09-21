"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { FcGoogle } from "react-icons/fc";
import { FaFacebook } from "react-icons/fa";
import { Eye, EyeOff } from "lucide-react";

function sanitizeRedirect(path: string | undefined): string | null {
  if (!path) {
    return null;
  }

  if (!path.startsWith("/")) {
    return null;
  }

  if (path.startsWith("//")) {
    return null;
  }

  if (path.includes("://")) {
    return null;
  }

  return path;
}

type BookingDraft = {
  roomId?: string;
  arrivalDate?: string;
  nights?: number;
  pricingPlan?: string;
  guests?: { adults?: number; children?: number };
  guest?: {
    fullName?: string;
    email?: string;
    phone?: string;
    identityDocumentUrl?: string;
  };
};

export function CustomerSignInForm({ redirectTo, from }: { redirectTo?: string; from?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const safeRedirect = sanitizeRedirect(redirectTo);
  const oauthCallbackUrl = "/booking/auth-callback?mode=dashboard";
  const facebookUrl = `/api/auth/signin/facebook?callbackUrl=${encodeURIComponent(oauthCallbackUrl)}`;

  async function restoreBookingDraft(userId: string | undefined): Promise<string | null> {
    let draft: BookingDraft | null = null;
    try {
      const raw = sessionStorage.getItem("bookingDraft");
      if (!raw) {
        return null;
      }
      draft = JSON.parse(raw) as BookingDraft;
    } catch {
      return null;
    }

    if (!draft || !draft.roomId || !draft.arrivalDate) {
      return null;
    }

    const bookingResponse = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId: draft.roomId,
        arrivalDate: draft.arrivalDate,
        nights: draft.nights ?? 1,
        pricingPlan: draft.pricingPlan ?? "BED_ONLY",
        guests: {
          adults: draft.guests?.adults ?? 2,
          children: draft.guests?.children ?? 0,
        },
        guest: {
          fullName: draft.guest?.fullName ?? "",
          email: draft.guest?.email ?? "",
          phone: draft.guest?.phone ?? "",
          identityDocumentUrl: draft.guest?.identityDocumentUrl ?? "/uploads/ids/placeholder.jpg",
          privacyAccepted: true,
        },
        userId,
        idempotencyKey: crypto.randomUUID(),
      }),
    });

    const bookingData = await bookingResponse.json().catch(() => ({}));
    if (!bookingResponse.ok || !bookingData?.booking?._id) {
      return null;
    }

    return String(bookingData.booking._id);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "include",
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.message ?? "Authentication failed");
      return;
    }

    const userRole = data?.user?.role;
    if (userRole !== "CUSTOMER") {
      setError("Only customer accounts are allowed for this sign-in.");
      return;
    }

    if (data.accessToken) {
      localStorage.setItem("hotel_saas_token", data.accessToken);
    }

    if (from === "booking") {
      const bookingId = await restoreBookingDraft(data?.user?.id);
      if (bookingId) {
        sessionStorage.setItem("booking_progress_booking_id", bookingId);
        sessionStorage.setItem("booking_progress_continue_payment", "1");
        router.replace(`/booking/payment?bookingId=${encodeURIComponent(bookingId)}`);
        return;
      }
    }

    router.replace(safeRedirect ?? "/customer/dashboard");
  }

  const inputClasses =
    "w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/40 transition-colors";

  return (
    <div className="w-full">
      <h1 className="text-center text-2xl font-bold text-slate-900 sm:text-[30px]">Login to continue</h1>

      <form onSubmit={submit} className="mt-8 grid gap-4" noValidate={false}>
        <div className="grid gap-1.5">
          <label htmlFor="customer-email" className="text-sm font-semibold text-slate-700">
            Email
          </label>
          <input
            id="customer-email"
            type="email"
            autoComplete="email"
            placeholder="Email Address"
            className={inputClasses}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="grid gap-1.5">
          <label htmlFor="customer-password" className="text-sm font-semibold text-slate-700">
            Password
          </label>
          <div className="relative">
            <input
              id="customer-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Password"
              className={`${inputClasses} pr-11`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition-colors hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/40"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div className="text-right">
          <Link
            href={from === "booking" ? "/auth/forgot-password?from=booking" : "/auth/forgot-password"}
            className="text-sm font-medium text-[#2563EB] transition-colors hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/40"
          >
            Forgot Password?
          </Link>
        </div>

        {error ? (
          <p className="text-sm font-medium text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          aria-busy={loading}
          className="flex h-[46px] w-full items-center justify-center rounded-lg bg-[#2563EB] text-sm font-bold text-white transition-colors hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-70 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8] focus-visible:ring-offset-2"
        >
          {loading ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden="true" /> : "Sign In"}
        </button>
      </form>

      <div className="mt-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-slate-200" />
        <span className="text-sm text-[#64748B]">Or Continue with</span>
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => signIn("google", { callbackUrl: oauthCallbackUrl })}
          aria-label="Continue with Google"
          className="flex h-[46px] items-center justify-center rounded-lg border border-slate-300 bg-white transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/40"
        >
          <FcGoogle size={20} />
        </button>
        <a
          href={facebookUrl}
          aria-label="Continue with Facebook"
          className="flex h-[46px] items-center justify-center rounded-lg border border-slate-300 bg-white transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/40"
        >
          <FaFacebook size={20} className="text-[#1877F2]" />
        </a>
      </div>

      <p className="mt-6 text-center text-sm text-slate-500">
        Don&apos;t have an account yet,{" "}
        <Link
          href="/booking/detail"
          className="font-semibold text-[#2563EB] hover:underline"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}
