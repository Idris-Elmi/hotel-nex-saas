"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const links = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/rooms", label: "Rooms" },
  { href: "/blog", label: "Blog" },
  { href: "/about", label: "About-Us" },
  { href: "/contact", label: "Contact" },
];

export function SiteNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const previousPathnameRef = useRef(pathname);
  const [authReady, setAuthReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isBookingDetailsPage = pathname === "/booking/details" || pathname === "/booking/detail";
  const isCustomerPage = pathname === "/customer";
  const isPublicNavPage =
    pathname === "/" ||
    pathname === "/services" ||
    pathname === "/rooms" ||
    pathname === "/about" ||
    pathname === "/contact" ||
    pathname.startsWith("/blog");

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
      });

      if (!active) {
        return;
      }

      if (!response.ok) {
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

  async function clearSession() {
    localStorage.removeItem("hotel_saas_token");
    setSignedIn(false);
    await fetch("/api/auth/logout", {
      method: "POST",
      keepalive: true,
    }).catch(() => null);
  }

  useEffect(() => {
    const previousPathname = previousPathnameRef.current;
    const wasCustomerOrBooking = previousPathname.startsWith("/customer") || previousPathname.startsWith("/booking");
    const movedToAnotherPath = pathname !== previousPathname;

    if (movedToAnotherPath && wasCustomerOrBooking) {
      void clearSession();
    }

    previousPathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handlePageLeave() {
      localStorage.removeItem("hotel_saas_token");
      if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
        navigator.sendBeacon("/api/auth/logout", new Blob([], { type: "application/json" }));
      }
    }

    window.addEventListener("pagehide", handlePageLeave);
    window.addEventListener("beforeunload", handlePageLeave);
    return () => {
      window.removeEventListener("pagehide", handlePageLeave);
      window.removeEventListener("beforeunload", handlePageLeave);
    };
  }, []);

  async function signOut() {
    await clearSession();

    if (isCustomerPage) {
      router.push("/booking/details");
      return;
    }

    const query = searchParams.toString();
    const backTo = `${pathname}${query ? `?${query}` : ""}`;
    router.push(backTo || "/");
  }

  if (!isPublicNavPage && !isBookingDetailsPage && !isCustomerPage) {
    return null;
  }

  const actionButtonClass =
    "rounded-full border border-amber-300 bg-amber-300 px-4 py-2 text-xs font-bold uppercase tracking-wide text-[#2e2112] shadow-sm transition duration-300 hover:-translate-y-0.5 hover:bg-amber-200";

  const customerActionButtonClass =
    "rounded-full border border-slate-900 bg-slate-900 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white shadow-sm transition duration-300 hover:-translate-y-0.5 hover:bg-slate-700 dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white";

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur-lg dark:border-slate-800/70 dark:bg-slate-950/85">
      <div className={`mx-auto flex max-w-7xl items-center px-4 py-3 sm:px-6 ${isCustomerPage ? "justify-end" : "justify-between"}`}>
        {isCustomerPage ? null : (
          <Link href="/" className="flex items-center gap-3 font-serif text-lg font-bold tracking-wide text-slate-900 transition hover:text-amber-700 dark:text-slate-100 dark:hover:text-amber-300">
            <img src="/images/LuxuryHotelLogo.jpg" alt="Aroura Luxury Hotel logo" className="h-10 w-10 rounded-full bg-white/80 object-contain p-1" />
            <span className="hidden sm:inline">Aroura Luxury Hotel</span>
          </Link>
        )}

        {isBookingDetailsPage || isCustomerPage ? null : (
          <nav className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-2 py-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-900/70 md:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full px-3 py-1.5 text-sm font-semibold text-slate-700 transition duration-300 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}

        {isBookingDetailsPage || isCustomerPage ? null : (
          <button
            type="button"
            onClick={() => setMobileMenuOpen((current) => !current)}
            className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white/80 p-2 text-slate-800 shadow-sm transition hover:bg-white md:hidden"
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation menu"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 6h18" />
              <path d="M3 12h18" />
              <path d="M3 18h18" />
            </svg>
          </button>
        )}

        {isBookingDetailsPage ? (
          <Link
            href="/auth/customer-signin"
            className={actionButtonClass}
          >
            Sign In
          </Link>
        ) : isCustomerPage ? (
          !authReady || !signedIn ? (
            <Link
              href="/auth/customer-signin?redirectTo=%2Fcustomer"
              className={actionButtonClass}
            >
              Sign In
            </Link>
          ) : (
            <button
              type="button"
              onClick={signOut}
              className={customerActionButtonClass}
            >
              Sign Out
            </button>
          )
        ) : (
          <Link href="/booking/detail" className={`${actionButtonClass} hidden md:inline-flex`}>
            Book Now
          </Link>
        )}
      </div>

      {isBookingDetailsPage || isCustomerPage ? null : mobileMenuOpen ? (
        <div className="border-t border-slate-200/80 bg-white/95 px-4 py-3 shadow-sm backdrop-blur dark:border-slate-800/80 dark:bg-slate-950/95 md:hidden">
          <nav className="grid gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <Link
            href="/booking/detail"
            className="mt-3 inline-flex w-full items-center justify-center rounded-full border border-amber-300 bg-amber-300 px-4 py-2 text-xs font-bold uppercase tracking-wide text-[#2e2112] shadow-sm transition hover:bg-amber-200"
          >
            Book Now
          </Link>
        </div>
      ) : null}
    </header>
  );
}
