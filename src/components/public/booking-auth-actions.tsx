"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function BookingAuthActions() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let active = true;

    async function resolveAuthState() {
      const token = localStorage.getItem("hotel_saas_token")?.trim() ?? "";
      if (!token) {
        if (active) {
          setSignedIn(false);
          setAuthReady(true);
        }
        return;
      }

      const response = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }).catch(() => null);

      if (!active) {
        return;
      }

      if (!response || !response.ok) {
        localStorage.removeItem("hotel_saas_token");
        setSignedIn(false);
        setAuthReady(true);
        return;
      }

      setSignedIn(true);
      setAuthReady(true);
    }

    resolveAuthState();

    return () => {
      active = false;
    };
  }, []);

  async function signOut() {
    setSigningOut(true);
    localStorage.removeItem("hotel_saas_token");
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    setSignedIn(false);
    setSigningOut(false);

    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/booking/details");
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
      <p className="text-sm text-slate-700">Account access:</p>
      {!authReady ? (
        <span className="text-sm text-slate-500">Checking session...</span>
      ) : !signedIn ? (
        <Link
          href="/auth/customer-signin?redirectTo=%2Fcustomer"
          className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-950 transition hover:bg-amber-400"
        >
          Sign In
        </Link>
      ) : (
        <button
          type="button"
          onClick={signOut}
          disabled={signingOut}
          className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-slate-700 disabled:opacity-60"
        >
          {signingOut ? "Signing Out..." : "Sign Out"}
        </button>
      )}
    </div>
  );
}
