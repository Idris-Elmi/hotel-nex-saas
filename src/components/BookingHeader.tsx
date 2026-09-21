"use client";

import { useEffect, useState } from "react";
import { Sun, Moon, BedDouble } from "lucide-react";
import Link from "next/link";

const STEP_LABELS: Record<number, string> = {
  1: "Booking Details",
  2: "Room Selection",
  3: "Guest Information",
  4: "Account",
  5: "Payment",
  6: "Confirmation",
};

export default function BookingHeader({ currentStep }: { currentStep: number }) {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    setIsDarkMode(document.documentElement.classList.contains("dark"));
  }, []);

  function toggleTheme() {
    const isDark = document.documentElement.classList.toggle("dark");
    localStorage.setItem("theme", isDark ? "dark" : "light");
    setIsDarkMode(isDark);
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-white/80 dark:bg-[#1a2332] backdrop-blur-md border-b border-slate-200 dark:border-white/5 flex items-center justify-between px-6 transition-colors duration-200">
      <Link href="/" className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#2dd4bf] flex items-center justify-center flex-shrink-0">
          <BedDouble size={18} className="text-white dark:text-[#0f1623]" />
        </div>
        <span className="text-xl font-bold text-slate-900 dark:text-white">Aurora Stay</span>
      </Link>

      <div className="text-sm font-semibold text-slate-600 dark:text-gray-300">
        {STEP_LABELS[currentStep] ?? `Step ${currentStep}`}
      </div>

      <button
        onClick={toggleTheme}
        className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-[#243044] flex items-center justify-center hover:bg-slate-200 dark:hover:bg-[#2a3a52] transition-all duration-200 cursor-pointer"
        aria-label="Toggle dark mode"
      >
        {isDarkMode ? <Sun size={17} className="text-amber-400" /> : <Moon size={17} className="text-slate-500" />}
      </button>
    </header>
  );
}
