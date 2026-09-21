"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { FcGoogle } from "react-icons/fc";
import { FaFacebook } from "react-icons/fa";
import { AlertCircle, Eye, EyeOff } from "lucide-react";

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

  const [showOptionASignIn, setShowOptionASignIn] = useState(false);
  const [showOptionBSignIn, setShowOptionBSignIn] = useState(false);
  const [signInEmail, setSignInEmail] = useState(params.get("email") ?? "");
  const [signInPassword, setSignInPassword] = useState("");
  const [signInError, setSignInError] = useState<string | null>(null);
  const [signInLoading, setSignInLoading] = useState(false);
  const [showPasswordVisible, setShowPasswordVisible] = useState(false);

  const returnToPayment = params.get("returnTo") === "payment";
  const bookingIdParam = params.get("bookingId")?.trim() ?? "";

  const guestInfo = useMemo(() => {
    const fromSession = typeof window !== "undefined" ? sessionStorage.getItem("booking_guest_info") : null;
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

  useEffect(() => {
    const token = localStorage.getItem("hotel_saas_token")?.trim() ?? "";
    if (token) {
      if (returnToPayment && bookingIdParam) {
        router.replace(`/booking/payment?bookingId=${encodeURIComponent(bookingIdParam)}&scrollTo=payment-proof`);
      } else {
        const existingBookingId = sessionStorage.getItem("booking_progress_booking_id")?.trim() ?? "";
        if (existingBookingId) {
          router.replace(`/booking/payment?bookingId=${encodeURIComponent(existingBookingId)}`);
        }
      }
    }
  }, []);

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

    if (returnToPayment && bookingIdParam) {
      const tokenForLink = localStorage.getItem("hotel_saas_token")?.trim() ?? "";
      await fetch(`/api/bookings/${encodeURIComponent(bookingIdParam)}/link-user`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenForLink}`,
        },
      });
      router.replace(`/booking/payment?bookingId=${encodeURIComponent(bookingIdParam)}&scrollTo=payment-proof`);
      return;
    }

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
      console.log("handleAuthSuccess — booking creation failed", bookingResponse.status, bookingData);
      setError(bookingData.message ?? "Account created, but booking reservation failed. Please try again.");
      return;
    }

    const bookingId = String(bookingData.booking._id);
    console.log("handleAuthSuccess — navigating to payment", bookingId);
    sessionStorage.setItem("booking_progress_booking_id", bookingId);
    sessionStorage.setItem("booking_progress_continue_payment", "1");

    router.push(`/booking/payment?bookingId=${encodeURIComponent(bookingId)}`);
  }

  async function handleInlineSignIn(e: FormEvent) {
    e.preventDefault();
    setSignInLoading(true);
    setSignInError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: signInEmail, password: signInPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        setSignInError(data.message || "Invalid email or password.");
        setSignInLoading(false);
        return;
      }

      const token = data.accessToken?.trim() ?? "";
      if (!token) {
        setSignInError("Authentication succeeded but no token was returned.");
        setSignInLoading(false);
        return;
      }

      localStorage.setItem("hotel_saas_token", token);

      if (returnToPayment && bookingIdParam) {
        const tokenForLink = localStorage.getItem("hotel_saas_token")?.trim() ?? "";
        await fetch(`/api/bookings/${encodeURIComponent(bookingIdParam)}/link-user`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${tokenForLink}`,
          },
        });
        router.replace(`/booking/payment?bookingId=${encodeURIComponent(bookingIdParam)}&scrollTo=payment-proof`);
        setSignInLoading(false);
        return;
      }

      const bookingResponse = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...bookingPayload,
          userId: data.user?.id,
          idempotencyKey: crypto.randomUUID(),
        }),
      });

      const bookingData = await bookingResponse.json().catch(() => ({}));
      if (!bookingResponse.ok || !bookingData?.booking?._id) {
        setSignInError(bookingData.message ?? "Signed in, but booking reservation failed. Please try again.");
        setSignInLoading(false);
        return;
      }

      const bookingId = String(bookingData.booking._id);
      sessionStorage.setItem("booking_progress_booking_id", bookingId);
      sessionStorage.setItem("booking_progress_continue_payment", "1");

      router.push(`/booking/payment?bookingId=${encodeURIComponent(bookingId)}`);
    } catch {
      setSignInError("Network error. Please try again.");
    } finally {
      setSignInLoading(false);
    }
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

    router.push(`/auth/customer-signin?redirectTo=${encodeURIComponent(`/booking/payment?bookingId=${encodeURIComponent(bookingId)}&focus=upload`)}`);
  }

  async function saveDraft(): Promise<string> {
    const res = await fetch('/api/booking-drafts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId: params.get("roomId") ?? "",
        arrivalDate: params.get("arrivalDate") ?? "",
        nights: Number(params.get("nights") ?? "1"),
        adults: Number(params.get("adults") ?? "2"),
        children: Number(params.get("children") ?? "0"),
        pricingPlan: params.get("pricingPlan") ?? "BED_ONLY",
        guestInfo: {
          firstName: guestInfo.firstName ?? "",
          lastName: guestInfo.lastName ?? "",
          fullName: guestInfo.fullName ?? "",
          email: guestInfo.email ?? "",
          phone: guestInfo.phone ?? "",
          address: guestInfo.address ?? "",
          identityDocumentUrl: params.get("identityDocumentUrl") ?? "",
        }
      })
    })

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.draftId) {
      throw new Error(data.error ?? 'Failed to save booking. Please try again.');
    }

    return String(data.draftId);
  }

  function handleForgotPassword() {
    sessionStorage.setItem("bookingDraft", JSON.stringify(bookingPayload));
    router.push("/auth/forgot-password?from=booking");
  }

  async function handleGoogleSignIn() {
    try {
      if (returnToPayment && bookingIdParam) {
        sessionStorage.setItem("googleOAuthInProgress", "true");
        signIn('google', {
          callbackUrl: `/booking/payment?bookingId=${encodeURIComponent(bookingIdParam)}`
        });
        return;
      }

      const draftId = await saveDraft();
      sessionStorage.setItem("googleOAuthInProgress", "true");

      signIn('google', {
        callbackUrl: `/booking/auth-callback?mode=booking&draftId=${draftId}`
      })
    } catch (error) {
      sessionStorage.removeItem("googleOAuthInProgress");
      setError(error instanceof Error ? error.message : 'Failed to save booking. Please try again.')
    }
  }

  async function handleFacebookSignIn() {
    try {
      if (returnToPayment && bookingIdParam) {
        sessionStorage.setItem("googleOAuthInProgress", "true");
        const callbackUrl = `/booking/payment?bookingId=${encodeURIComponent(bookingIdParam)}`;
        window.location.href = `/api/auth/signin/facebook?callbackUrl=${encodeURIComponent(callbackUrl)}`;
        return;
      }

      const draftId = await saveDraft();
      sessionStorage.setItem("googleOAuthInProgress", "true");
      const callbackUrl = `/booking/auth-callback?mode=booking&draftId=${draftId}`;
      window.location.href = `/api/auth/signin/facebook?callbackUrl=${encodeURIComponent(callbackUrl)}`;
    } catch (error) {
      sessionStorage.removeItem("googleOAuthInProgress");
      setError(error instanceof Error ? error.message : 'Failed to save booking. Please try again.')
    }
  }

  async function submitRegister(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!createUsername.trim() || !createPassword || !createConfirmPassword) {
      setError("Fill all Create Account fields.");
      return;
    }

    if (createPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (!/[a-z]/.test(createPassword)) {
      setError("Password must contain at least one lowercase letter.");
      return;
    }
    if (!/[A-Z]/.test(createPassword)) {
      setError("Password must contain at least one uppercase letter.");
      return;
    }
    if (!/[0-9]/.test(createPassword)) {
      setError("Password must contain at least one number.");
      return;
    }
    if (!/[^a-zA-Z0-9]/.test(createPassword)) {
      setError("Password must contain at least one symbol.");
      return;
    }

    if (createPassword !== createConfirmPassword) {
      setError("Password and Confirm Password must match.");
      return;
    }

    setLoading("register");
    const rawName = (guestInfo.fullName ?? `${guestInfo.firstName ?? ""} ${guestInfo.lastName ?? ""}`).trim();
    const fallbackName = createUsername.split("@")[0]?.replace(/[._-]+/g, " ").trim();
    const resolvedName = rawName || fallbackName || "Guest User";

    const response = await fetch("/api/auth/customer/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: resolvedName,
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
    <section className="rounded-2xl border border-[#e8ddd4] dark:border-[#3a2a1a] bg-[#faf6f2] dark:bg-[#251a0f] p-7 shadow-sm transition-colors duration-200">
      <h1 className="text-3xl font-black text-[#1a1a1a] dark:text-white">Step 4: Account Setup / Authentication</h1>
      {error ? <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1.5"><AlertCircle size={13} className="flex-shrink-0" />{error}</p> : null}

      <div className="mt-6 grid gap-6">
        <div className="rounded-2xl border border-[#e8ddd4] dark:border-[#3a2a1a] bg-[#faf6f2] dark:bg-[#251a0f] p-5">
          <h2 className="text-lg font-bold text-[#1a1a1a] dark:text-white">Option A: Create Account (Manual)</h2>

          {!showOptionASignIn ? (
            <form onSubmit={submitRegister} className="grid gap-3">
              <label className="grid gap-1 text-sm font-medium text-[#3a2a1a] dark:text-[#c4a882]">
                Username / Email
                <input
                  className="w-full px-4 py-2.5 rounded-xl text-sm bg-white dark:bg-[#1f1408] border border-[#e0d5c8] dark:border-[#3a2a1a] text-[#1a1a1a] dark:text-white placeholder:text-[#c4b4a4] dark:placeholder:text-[#5a4a3a] focus:outline-none focus:ring-2 focus:ring-[#c0392b]/30 focus:border-[#c0392b] dark:focus:ring-[#e74c3c]/30 dark:focus:border-[#e74c3c] transition-all duration-200"
                  type="email"
                  value={createUsername}
                  onChange={(e) => setCreateUsername(e.target.value)}
                  required
                />
              </label>

              <label className="grid gap-1 text-sm font-medium text-[#3a2a1a] dark:text-[#c4a882]">
                Password
                <input
                  className="w-full px-4 py-2.5 rounded-xl text-sm bg-white dark:bg-[#1f1408] border border-[#e0d5c8] dark:border-[#3a2a1a] text-[#1a1a1a] dark:text-white placeholder:text-[#c4b4a4] dark:placeholder:text-[#5a4a3a] focus:outline-none focus:ring-2 focus:ring-[#c0392b]/30 focus:border-[#c0392b] dark:focus:ring-[#e74c3c]/30 dark:focus:border-[#e74c3c] transition-all duration-200"
                  type="password"
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                  required
                />
              </label>

              <label className="grid gap-1 text-sm font-medium text-[#3a2a1a] dark:text-[#c4a882]">
                Confirm Password
                <input
                  className="w-full px-4 py-2.5 rounded-xl text-sm bg-white dark:bg-[#1f1408] border border-[#e0d5c8] dark:border-[#3a2a1a] text-[#1a1a1a] dark:text-white placeholder:text-[#c4b4a4] dark:placeholder:text-[#5a4a3a] focus:outline-none focus:ring-2 focus:ring-[#c0392b]/30 focus:border-[#c0392b] dark:focus:ring-[#e74c3c]/30 dark:focus:border-[#e74c3c] transition-all duration-200"
                  type="password"
                  value={createConfirmPassword}
                  onChange={(e) => setCreateConfirmPassword(e.target.value)}
                  required
                />
              </label>

              <button className="w-full py-3 rounded-xl text-sm font-bold text-white bg-[#c0392b] hover:bg-[#a93226] dark:bg-[#c0392b] dark:hover:bg-[#a93226] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-[#c0392b]/20 transition-all duration-200" type="submit" disabled={loading === "register"}>
                {loading === "register" ? "Creating account..." : "Create Account & Continue"}
              </button>

              <button
                type="button"
                className="text-left text-sm font-semibold text-[#c0392b] hover:underline dark:text-[#e74c3c]"
                onClick={() => { setShowOptionASignIn(true); setSignInError(null); }}
              >
                Already have an account? Sign in
              </button>
            </form>
          ) : (
            <form onSubmit={handleInlineSignIn} className="grid gap-3">
              <label className="grid gap-1 text-sm font-medium text-[#3a2a1a] dark:text-[#c4a882]">
                Email
                <input
                  className="w-full px-4 py-2.5 rounded-xl text-sm bg-white dark:bg-[#1f1408] border border-[#e0d5c8] dark:border-[#3a2a1a] text-[#1a1a1a] dark:text-white placeholder:text-[#c4b4a4] dark:placeholder:text-[#5a4a3a] focus:outline-none focus:ring-2 focus:ring-[#c0392b]/30 focus:border-[#c0392b] dark:focus:ring-[#e74c3c]/30 dark:focus:border-[#e74c3c] transition-all duration-200"
                  type="email"
                  value={signInEmail}
                  onChange={(e) => setSignInEmail(e.target.value)}
                  required
                  autoFocus
                />
              </label>

              <label className="grid gap-1 text-sm font-medium text-[#3a2a1a] dark:text-[#c4a882]">
                Password
                <div className="relative flex items-center">
                  <input
                    className="w-full px-4 py-2.5 pr-11 rounded-xl text-sm bg-white dark:bg-[#1f1408] border border-[#e0d5c8] dark:border-[#3a2a1a] text-[#1a1a1a] dark:text-white placeholder:text-[#c4b4a4] dark:placeholder:text-[#5a4a3a] focus:outline-none focus:ring-2 focus:ring-[#c0392b]/30 focus:border-[#c0392b] dark:focus:ring-[#e74c3c]/30 dark:focus:border-[#e74c3c] transition-all duration-200"
                    type={showPasswordVisible ? "text" : "password"}
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordVisible((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#b0a090] dark:text-[#5a4a3a] hover:text-[#3a2a1a] dark:hover:text-[#c4a882] transition-colors duration-150 cursor-pointer"
                  >
                    {showPasswordVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>

              <div className="text-right">
                <button
                  type="button"
                  className="text-sm text-[#c0392b] hover:underline dark:text-[#e74c3c] font-medium transition-colors"
                  onClick={handleForgotPassword}
                >
                  Forgot Password?
                </button>
              </div>

              {signInError ? (
                <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1.5"><AlertCircle size={13} className="flex-shrink-0" />{signInError}</p>
              ) : null}

              <button
                className="w-full py-3 rounded-xl text-sm font-bold text-white bg-[#c0392b] hover:bg-[#a93226] dark:bg-[#c0392b] dark:hover:bg-[#a93226] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-[#c0392b]/20 transition-all duration-200"
                type="submit"
                disabled={signInLoading}
              >
                {signInLoading ? "Signing in\u2026" : "Sign In & Continue"}
              </button>

              <button
                type="button"
                className="text-left text-xs text-[#c0392b] hover:underline dark:text-[#e74c3c] font-medium"
                onClick={() => { setShowOptionASignIn(false); setSignInError(null); }}
              >
                Back to registration
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-[#e8ddd4] dark:border-[#3a2a1a] bg-[#faf6f2] dark:bg-[#251a0f] p-5">
        <h3 className="text-base font-bold text-[#1a1a1a] dark:text-white">Option B: Social Sign-In</h3>
        <p className="mt-1 text-sm text-[#5a4a3a] dark:text-[#9a8a7a]">Authenticate with Google or Facebook and continue booking flow.</p>
        <div className="mt-3 space-y-3">
          <button
            type="button"
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl text-sm font-medium bg-white dark:bg-[#1f1408] border border-[#e0d5c8] dark:border-[#3a2a1a] text-[#1a1a1a] dark:text-[#c4a882] hover:bg-[#f5ede4] dark:hover:bg-[#2a1a0a] transition-all duration-200 cursor-pointer"
            onClick={handleGoogleSignIn}
          >
<FcGoogle size={18} /> Continue with Google
          </button>
          <button
            type="button"
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl text-sm font-medium bg-white dark:bg-[#1f1408] border border-[#e0d5c8] dark:border-[#3a2a1a] text-[#1a1a1a] dark:text-[#c4a882] hover:bg-[#f5ede4] dark:hover:bg-[#2a1a0a] transition-all duration-200 cursor-pointer"
            onClick={handleFacebookSignIn}
          >
<FaFacebook size={18} className="text-[#1877F2]" /> Continue with Facebook
          </button>
        </div>

        <div className="mt-4 border-t border-[#e0d5c8] pt-4 dark:border-[#3a2a1a]">
          {!showOptionBSignIn ? (
            <button
              type="button"
              className="text-sm text-[#c0392b] hover:underline dark:text-[#e74c3c] font-medium"
              onClick={() => { setShowOptionBSignIn(true); setSignInError(null); }}
            >
              Or sign in with email instead
            </button>
          ) : (
            <form onSubmit={handleInlineSignIn} className="grid gap-3">
              <label className="grid gap-1 text-sm font-medium text-[#3a2a1a] dark:text-[#c4a882]">
                Email
                <input
                  className="w-full px-4 py-2.5 rounded-xl text-sm bg-white dark:bg-[#1f1408] border border-[#e0d5c8] dark:border-[#3a2a1a] text-[#1a1a1a] dark:text-white placeholder:text-[#c4b4a4] dark:placeholder:text-[#5a4a3a] focus:outline-none focus:ring-2 focus:ring-[#c0392b]/30 focus:border-[#c0392b] dark:focus:ring-[#e74c3c]/30 dark:focus:border-[#e74c3c] transition-all duration-200"
                  type="email"
                  value={signInEmail}
                  onChange={(e) => setSignInEmail(e.target.value)}
                  required
                  autoFocus
                />
              </label>

              <label className="grid gap-1 text-sm font-medium text-[#3a2a1a] dark:text-[#c4a882]">
                Password
                <div className="relative flex items-center">
                  <input
                    className="w-full px-4 py-2.5 pr-11 rounded-xl text-sm bg-white dark:bg-[#1f1408] border border-[#e0d5c8] dark:border-[#3a2a1a] text-[#1a1a1a] dark:text-white placeholder:text-[#c4b4a4] dark:placeholder:text-[#5a4a3a] focus:outline-none focus:ring-2 focus:ring-[#c0392b]/30 focus:border-[#c0392b] dark:focus:ring-[#e74c3c]/30 dark:focus:border-[#e74c3c] transition-all duration-200"
                    type={showPasswordVisible ? "text" : "password"}
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordVisible((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#b0a090] dark:text-[#5a4a3a] hover:text-[#3a2a1a] dark:hover:text-[#c4a882] transition-colors duration-150 cursor-pointer"
                  >
                    {showPasswordVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>

              <div className="text-right">
                <button
                  type="button"
                  className="text-sm text-[#c0392b] hover:underline dark:text-[#e74c3c] font-medium transition-colors"
                  onClick={handleForgotPassword}
                >
                  Forgot Password?
                </button>
              </div>

              {signInError ? (
                <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1.5"><AlertCircle size={13} className="flex-shrink-0" />{signInError}</p>
              ) : null}

              <button
                className="w-full py-3 rounded-xl text-sm font-bold text-white bg-[#c0392b] hover:bg-[#a93226] dark:bg-[#c0392b] dark:hover:bg-[#a93226] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-[#c0392b]/20 transition-all duration-200"
                type="submit"
                disabled={signInLoading}
              >
                {signInLoading ? "Signing in\u2026" : "Sign In & Continue"}
              </button>

              <button
                type="button"
                className="text-left text-xs text-[#c0392b] hover:underline dark:text-[#e74c3c] font-medium"
                onClick={() => { setShowOptionBSignIn(false); setSignInError(null); }}
              >
                Back to social sign-in
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
