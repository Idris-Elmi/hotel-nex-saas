"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

function sanitizeRedirect(path: string | null): string | null {
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

function decodeJwtSub(token: string): string | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof decoded.sub === "string" ? decoded.sub : null;
  } catch {
    return null;
  }
}

export default function AuthCallbackPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const mode = params.get("mode");
  const draftId = params.get("draftId");
  const safeRedirect = sanitizeRedirect(params.get("redirectTo"));
  const exchanged = useRef(false);
  const converted = useRef(false);

  useEffect(() => {
    if (status === "loading") return;
    if (exchanged.current) return;

    exchanged.current = true;

    if (!session?.user?.email) {
      const query = new URLSearchParams();
      if (mode) query.set("mode", mode);
      if (draftId) query.set("draftId", draftId);
      if (safeRedirect) query.set("redirectTo", safeRedirect);
      const next = query.toString();
      router.replace(`/booking/auth-callback${next ? `?${next}` : ""}`);
      return;
    }

    fetch("/api/auth/google/exchange", { method: "POST" })
      .then((res) => res.json())
      .then((data) => {
        if (data.accessToken) {
          localStorage.setItem("hotel_saas_token", data.accessToken);
        }
        sessionStorage.removeItem("googleOAuthInProgress");

        if (mode === "dashboard") {
          router.replace(data.accessToken ? "/customer/dashboard" : "/booking/detail");
          return;
        }

        if (mode === "booking" || draftId) {
          if (!draftId) {
            router.replace("/booking/detail");
            return;
          }

          if (converted.current) return;
          converted.current = true;

          return fetch(`/api/booking-drafts/${draftId}/convert`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${data.accessToken}`,
            },
          });
        }

        router.replace(safeRedirect ?? "/booking/detail");
      })
      .then((convertRes) => {
        if (!convertRes) return;
        const status = convertRes.status;
        return convertRes.json().then((body) => ({ status, ...body }));
      })
      .then((convertData) => {
        if (!convertData) return;

        const bookingId = convertData.bookingId;
        if (!bookingId) {
          router.replace("/booking/detail");
          return;
        }

        // 201 = newly converted, 409 = already converted — both have bookingId
        if (convertData.status === 409 && convertData.alreadyConverted) {
          // Ownership check — different user completed this draft first
          const token = localStorage.getItem("hotel_saas_token")?.trim() ?? "";
          const currentUserId = token ? decodeJwtSub(token) : null;

          if (convertData.ownerUserId && currentUserId && convertData.ownerUserId !== currentUserId) {
            // Different user owns this draft's booking — start fresh
            router.replace("/booking/detail?error=session_conflict");
            return;
          }

          // Same user — check booking payment status for correct redirect
          fetch(`/api/bookings/${bookingId}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          })
            .then((r) => r.json())
            .then((bookingData) => {
              const booking = bookingData.booking;
              if (booking?.paymentStatus === "PAID" || booking?.status === "CONFIRMED") {
                router.replace(`/booking/confirmation/${bookingId}`);
              } else {
                router.replace(`/booking/payment?bookingId=${bookingId}`);
              }
            })
            .catch(() => {
              router.replace(`/booking/payment?bookingId=${bookingId}`);
            });
          return;
        }

        // Normal 201 — newly converted, go to payment
        router.replace(`/booking/payment?bookingId=${bookingId}`);
      })
      .catch(() => {
        router.replace("/booking/detail");
      });
  }, [session, status, mode, draftId, safeRedirect, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5ede4] dark:bg-[#1a1008]">
      <p className="text-sm text-slate-600 dark:text-[#94a3b8]">Completing authentication...</p>
    </div>
  );
}
