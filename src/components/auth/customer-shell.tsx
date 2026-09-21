"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { User, CalendarDays, Settings, Bell, BedDouble, ClipboardList, Moon, Sun } from "lucide-react";

export function CustomerShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authReady, setAuthReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    setIsDarkMode(document.documentElement.classList.contains("dark"));
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

  function toggleTheme() {
    const isDark = document.documentElement.classList.toggle("dark");
    localStorage.setItem("theme", isDark ? "dark" : "light");
    setIsDarkMode(isDark);
  }

  function switchTab(tab: string) {
    (window as any).__switchTab?.(tab);
  }

  async function signOut() {
    setSigningOut(true);
    localStorage.removeItem("hotel_saas_token");
    await fetch("/api/auth/logout", { method: "POST", keepalive: true }).catch(() => null);
    setSignedIn(false);
    setSigningOut(false);
    router.replace("/auth/customer-signin");
  }

  const redirectTo = encodeURIComponent(pathname || "/customer");

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0f1623] pt-16 transition-colors duration-200">
      <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-white/80 dark:bg-[#1a2332] backdrop-blur-md border-b border-slate-200 dark:border-white/5 flex items-center justify-between px-6 transition-colors duration-200">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#2dd4bf] flex items-center justify-center flex-shrink-0">
            <BedDouble size={18} className="text-white dark:text-[#0f1623]" />
          </div>
          <span className="text-xl font-bold text-slate-900 dark:text-white">Aurora Stay</span>
        </div>

        <div className="hidden md:flex items-center gap-6">
          <button
            onClick={() => switchTab("profile")}
            className="text-sm font-medium text-indigo-600 dark:text-white font-semibold transition-colors duration-200"
          >
            Profile
          </button>
          <button
            onClick={() => switchTab("bookings")}
            className="text-sm font-medium text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white transition-colors duration-200"
          >
            My Bookings
          </button>
          <button
            onClick={() => switchTab("journey")}
            className="text-sm font-medium text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white transition-colors duration-200"
          >
            Booking Journey
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-[#243044] flex items-center justify-center hover:bg-slate-200 dark:hover:bg-[#2a3a52] transition-all duration-200 cursor-pointer">
            <Settings size={17} className="text-slate-500 dark:text-gray-400" />
          </div>
          <div className="relative w-9 h-9 rounded-xl bg-slate-100 dark:bg-[#243044] flex items-center justify-center hover:bg-slate-200 dark:hover:bg-[#2a3a52] transition-all duration-200 cursor-pointer">
            <Bell size={17} className="text-slate-500 dark:text-gray-400" />
          </div>

          {!authReady || !signedIn ? (
            <Link
              href={`/auth/customer-signin?redirectTo=${redirectTo}`}
              className="rounded-xl bg-[#2dd4bf] px-4 py-2 text-xs font-semibold text-white dark:text-[#0f1623] hover:bg-[#2dd4bf]/90 transition-all duration-200"
            >
              Sign In
            </Link>
          ) : (
            <button
              type="button"
              onClick={signOut}
              disabled={signingOut}
              className="w-9 h-9 rounded-full bg-[#2dd4bf] flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-[#2dd4bf]/50 transition-all duration-200 disabled:opacity-60"
            >
              <User size={17} className="text-white dark:text-[#0f1623]" />
            </button>
          )}
        </div>
      </header>

      <div className="flex">
        <aside className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-52 bg-white/80 dark:bg-[#1a2332] backdrop-blur-md border-r border-slate-200 dark:border-white/5 flex flex-col py-4 px-3 overflow-y-auto z-40 transition-colors duration-200">
          <nav className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => switchTab("profile")}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl w-full text-left text-slate-600 dark:text-gray-400 text-sm font-medium hover:bg-slate-100 dark:hover:bg-[#243044] hover:text-slate-900 dark:hover:text-white transition-all duration-200"
            >
              <User size={17} />
              Profile
            </button>
            <button
              type="button"
              onClick={() => switchTab("bookings")}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl w-full text-left text-slate-600 dark:text-gray-400 text-sm font-medium hover:bg-slate-100 dark:hover:bg-[#243044] hover:text-slate-900 dark:hover:text-white transition-all duration-200"
            >
              <CalendarDays size={17} />
              My Bookings
            </button>
            <button
              type="button"
              onClick={() => switchTab("journey")}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl w-full text-left text-slate-600 dark:text-gray-400 text-sm font-medium hover:bg-slate-100 dark:hover:bg-[#243044] hover:text-slate-900 dark:hover:text-white transition-all duration-200"
            >
              <ClipboardList size={17} />
              Booking Journey
            </button>
          </nav>

          <div className="mt-auto pt-4 border-t border-slate-200 dark:border-white/5 px-3 space-y-3">
            <button
              onClick={toggleTheme}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl w-full text-slate-500 dark:text-gray-400 text-sm font-medium hover:bg-slate-100 dark:hover:bg-[#243044] transition-all duration-200"
            >
              {isDarkMode ? <Sun size={17} /> : <Moon size={17} />}
              {isDarkMode ? "Light Mode" : "Dark Mode"}
            </button>
            <p className="text-xs text-slate-400 dark:text-gray-500">
              Select a booking to view all details from Step 1 to Step 6.
            </p>
          </div>
        </aside>

        <main className="ml-52 flex-1 p-6 lg:p-8 min-h-[calc(100vh-4rem)] transition-colors duration-200">
          {children}
        </main>
      </div>
    </div>
  );
}