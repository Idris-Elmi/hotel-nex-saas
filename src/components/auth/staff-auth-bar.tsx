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
      const token = sessionStorage.getItem("hotel_saas_token_staff")?.trim() ?? "";
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
        setSignedIn(false);
        setAuthReady(true);
        return;
      }

      const payload = (await response.json().catch(() => ({}))) as { user?: { role?: string } };
      const role = payload.user?.role;
      if (role !== "OWNER" && role !== "ADMIN" && role !== "RECEPTIONIST") {
        sessionStorage.removeItem("hotel_saas_token_staff");
        localStorage.removeItem("hotel_saas_token_staff");
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
    sessionStorage.removeItem("hotel_saas_token_staff");
    localStorage.removeItem("hotel_saas_token_staff");
    await fetch("/api/auth/logout", { method: "POST", keepalive: true }).catch(() => null);
    setSignedIn(false);
    setSigningOut(false);
    router.replace("/auth/staff-signin");
  }

  const redirectTo = encodeURIComponent(pathname || "/");

  function readBadgeRole(): string | null {
    if (typeof window === "undefined") return null;
    try {
      const token = sessionStorage.getItem("hotel_saas_token_staff")?.trim() ?? "";
      if (!token) return null;
      const payload = token.split(".")[1];
      const claims = JSON.parse(atob(payload));
      return claims?.role ?? null;
    } catch {
      return null;
    }
  }

  const badgeRole = signedIn ? readBadgeRole() : null;

  return (
    <header className="h-16 w-full flex items-center justify-between px-6 bg-white dark:bg-[#0D1225] border-b border-slate-200 dark:border-[#1E2D4A] shadow-sm sticky top-0 z-50">
      <div className="flex items-center">
        <p className="text-xl font-serif font-bold text-indigo-700 dark:text-indigo-300">Aurora Stays</p>
        {badgeRole ? (
          <span className="ml-3 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-widest uppercase bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
            {badgeRole}
          </span>
        ) : null}
      </div>

      <div>
        {!authReady || !signedIn ? (
          <Link
            href={`/auth/staff-signin?redirectTo=${redirectTo}`}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-900 dark:bg-slate-700 text-white hover:bg-slate-700 dark:hover:bg-slate-500 transition-all duration-200"
          >
            Sign In
          </Link>
        ) : (
          <button
            type="button"
            onClick={signOut}
            disabled={signingOut}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-900 dark:bg-slate-700 text-white hover:bg-slate-700 dark:hover:bg-slate-500 transition-all duration-200 disabled:opacity-60"
          >
            {signingOut ? "Signing Out..." : "Sign Out"}
          </button>
        )}
      </div>
    </header>
  );
}
