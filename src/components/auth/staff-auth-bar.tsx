"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

export function StaffAuthBar() {
  const router = useRouter();
  const pathname = usePathname();
  const [authReady, setAuthReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let active = true;

    async function resolveAuth() {
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

      const payload = (await response.json().catch(() => ({}))) as { user?: { role?: string } };
      const role = payload.user?.role;
      if (role !== "ADMIN" && role !== "RECEPTIONIST") {
        localStorage.removeItem("hotel_saas_token");
        setSignedIn(false);
        setAuthReady(true);
        return;
      }

      setSignedIn(true);
      setAuthReady(true);
    }

    resolveAuth();
    return () => {
      active = false;
    };
  }, []);

  async function signOut() {
    setSigningOut(true);
    localStorage.removeItem("hotel_saas_token");
    await fetch("/api/auth/logout", { method: "POST", keepalive: true }).catch(() => null);
    setSignedIn(false);
    setSigningOut(false);
    router.replace("/auth/staff-signin");
  }

  const redirectTo = encodeURIComponent(pathname || "/");

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
        <p className="text-sm font-black tracking-wide text-slate-900 sm:text-base">Aurora Stays</p>

        <div>
          {!authReady || !signedIn ? (
            <Link
              href={`/auth/staff-signin?redirectTo=${redirectTo}`}
              className="rounded-full bg-amber-500 px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-950 transition hover:bg-amber-400"
            >
              Sign In
            </Link>
          ) : (
            <button
              type="button"
              onClick={signOut}
              disabled={signingOut}
              className="rounded-full bg-slate-900 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-slate-700 disabled:opacity-60"
            >
              {signingOut ? "Signing Out..." : "Sign Out"}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
