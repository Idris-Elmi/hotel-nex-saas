"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

export function CustomerShell({ children }: { children: React.ReactNode }) {
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
      if (payload.user?.role !== "CUSTOMER") {
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
    router.replace("/auth/customer-signin");
  }

  function scrollToSection(sectionId: string) {
    const target = document.getElementById(sectionId);
    if (!target) {
      return;
    }

    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const redirectTo = encodeURIComponent(pathname || "/customer");

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
          <p className="text-sm font-black tracking-wide text-slate-900 sm:text-base">Aurora Stays</p>

          {!authReady || !signedIn ? (
            <Link
              href={`/auth/customer-signin?redirectTo=${redirectTo}`}
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
      </header>

      <div className="mx-auto max-w-7xl px-6 pb-10 pt-24">
        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-24">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Customer Menu</p>
            <nav className="mt-3 grid gap-2">
              <button
                type="button"
                onClick={() => scrollToSection("profile")}
                className="rounded-lg border border-slate-200 px-3 py-2 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                Profile
              </button>
              <button
                type="button"
                onClick={() => scrollToSection("bookings")}
                className="rounded-lg border border-slate-200 px-3 py-2 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                My Bookings
              </button>
              <button
                type="button"
                onClick={() => scrollToSection("journey")}
                className="rounded-lg border border-slate-200 px-3 py-2 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                Booking Journey
              </button>
            </nav>

            <div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
              Select a booking to view all details from Step 1 to Step 6.
            </div>
          </aside>

          <section>{children}</section>
        </div>
      </div>
    </>
  );
}
