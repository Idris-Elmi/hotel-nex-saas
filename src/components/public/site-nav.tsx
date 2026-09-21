"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BedDouble, Sun, Moon } from "lucide-react";

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
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    setIsDarkMode(document.documentElement.classList.contains("dark"));
  }, []);

  function toggleTheme() {
    const isDark = document.documentElement.classList.toggle("dark");
    localStorage.setItem("theme", isDark ? "dark" : "light");
    setIsDarkMode(isDark);
  }
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
    const isNowCustomerOrBooking = pathname.startsWith("/customer") || pathname.startsWith("/booking");
    const movedToAnotherPath = pathname !== previousPathname;

    if (movedToAnotherPath && wasCustomerOrBooking && !isNowCustomerOrBooking) {
      void clearSession();
    }

    previousPathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handlePageLeave() {
      // Skip logout if Google OAuth is in progress — the state cookie
      // was set by signIn() and must survive the redirect round-trip.
      if (typeof sessionStorage !== "undefined" && sessionStorage.getItem("googleOAuthInProgress")) {
        sessionStorage.removeItem("googleOAuthInProgress");
        return;
      }
      // Skip logout on payment pages — refresh must preserve the token
      if (typeof window !== "undefined" && window.location.pathname.startsWith("/booking/payment")) {
        return;
      }
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

  if (isBookingDetailsPage) {
    return (
      <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-[#3d4f5c] border-b border-white/10 flex items-center justify-between px-6 lg:px-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full border-2 border-white flex items-center justify-center flex-shrink-0">
            <BedDouble size={17} className="text-white" />
          </div>
          <span className="text-lg font-bold text-white tracking-wide">Aurora Luxury Hotel</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Sun size={14} className="text-white/60" />
            <div className="relative w-11 h-6 rounded-full cursor-pointer bg-white/20 transition-colors duration-300" onClick={toggleTheme}>
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform duration-300 ${isDarkMode ? "translate-x-6" : "translate-x-1"}`} />
            </div>
            <Moon size={14} className="text-white/60" />
          </div>

          <Link
            href="/auth/customer-signin"
            className="px-5 py-2 rounded-xl text-sm font-bold bg-[#d4a644] text-[#1a202c] hover:bg-[#c49535] active:scale-[0.98] transition-all duration-200"
          >
            Sign In
          </Link>
        </div>
      </header>
    );
  }

  const actionButtonClass =
    "rounded-full border border-amber-300 bg-amber-300 px-4 py-2 text-xs font-bold uppercase tracking-wide text-[#2e2112] shadow-sm transition duration-300 hover:-translate-y-0.5 hover:bg-amber-200";

  const customerActionButtonClass =
    "rounded-full border border-slate-900 bg-slate-900 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white shadow-sm transition duration-300 hover:-translate-y-0.5 hover:bg-slate-700 dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white";

  return (
    <header className="sticky top-0 z-40 border-b border-[#d4a644]/20 bg-[#1c1c1c] shadow-lg shadow-black/20">
      <div className={`mx-auto flex max-w-7xl items-center px-4 py-3.5 sm:px-6 ${isCustomerPage ? "justify-end" : "justify-between"}`}>
        {isCustomerPage ? null : (
          <Link href="/" className="flex items-center gap-3 font-serif text-lg font-bold tracking-wide text-white transition hover:text-[#d4a644]">
            <img src="/images/LuxuryHotelLogo.jpg" alt="Aroura Luxury Hotel logo" className="h-10 w-10 rounded-full bg-white/80 object-contain p-1 ring-2 ring-[#d4a644]/40" />
            <span className="hidden sm:inline">Aroura Luxury Hotel</span>
          </Link>
        )}

        {isBookingDetailsPage || isCustomerPage ? null : (
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-3.5 py-2 text-sm font-semibold text-white/80 transition duration-300 hover:bg-white/10 hover:text-[#d4a644]"
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
            className="inline-flex items-center justify-center rounded-lg border border-white/15 bg-white/10 p-2 text-white transition hover:bg-white/20 md:hidden"
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
          <Link href="/booking/detail" className="hidden md:inline-flex items-center gap-1.5 rounded-lg bg-[#d4a644] px-5 py-2 text-sm font-bold text-[#1c1c1c] transition duration-300 hover:bg-[#c49535] active:scale-[0.98]">
            Book Now
          </Link>
        )}
      </div>

      {isBookingDetailsPage || isCustomerPage ? null : mobileMenuOpen ? (
        <div className="border-t border-white/10 bg-[#1c1c1c] px-4 py-3 shadow-lg md:hidden">
          <nav className="grid gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-[#d4a644]"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <Link
            href="/booking/detail"
            className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-[#d4a644] px-4 py-2 text-sm font-bold text-[#1c1c1c] transition hover:bg-[#c49535]"
          >
            Book Now
          </Link>
        </div>
      ) : null}
    </header>
  );
}
