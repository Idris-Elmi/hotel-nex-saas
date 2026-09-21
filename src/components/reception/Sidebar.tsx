"use client";

import { useState, useEffect } from "react";
import { Calendar, CalendarRange, BedDouble, CreditCard, UserPlus, ClipboardList, Moon, Sun, User, ChevronDown, ChevronRight } from "lucide-react";

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const navItems = [
  { id: "booking-details", label: "Customer Booking Details", icon: Calendar },
  { id: "availability", label: "Room Availability", icon: BedDouble },
  { id: "payment", label: "Payment Submission", icon: CreditCard },
  { id: "walk-in", label: "Walk-In Booking", icon: UserPlus },
  { id: "manage-booking", label: "Manage Booking", icon: ClipboardList },
];

const defaultLinkClass =
  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer w-full text-left";
const defaultClass = `${defaultLinkClass} text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100`;
const activeClass = `${defaultLinkClass} bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-semibold`;

export default function Sidebar({ activeSection, onSectionChange }: SidebarProps) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [reservationsOpen, setReservationsOpen] = useState(true);

  useEffect(() => {
    if (activeSection === "booking-details") setReservationsOpen(true);
  }, [activeSection]);

  useEffect(() => {
    setIsDarkMode(document.documentElement.classList.contains("dark"));
  }, []);

  function toggleTheme() {
    const isDark = document.documentElement.classList.toggle("dark");
    localStorage.setItem("theme", isDark ? "dark" : "light");
    setIsDarkMode(isDark);
  }

  return (
    <aside className="w-64 h-screen sticky top-16 bg-white/70 dark:bg-slate-900/80 backdrop-blur-xl border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between py-6 px-3">
      <nav className="grid gap-1">
        {/* RESERVATIONS GROUP */}
        {navItems.some((i) => i.id === "booking-details") && (
          <div key="reservations-group">
            <button
              onClick={() => setReservationsOpen((prev) => !prev)}
              className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer w-full text-left text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
            >
              <div className="flex items-center gap-3">
                <CalendarRange size={18} className="shrink-0" />
                <span>Reservations</span>
              </div>
              {reservationsOpen ? (
                <ChevronDown size={14} className="text-slate-400 dark:text-slate-500 flex-shrink-0" />
              ) : (
                <ChevronRight size={14} className="text-slate-400 dark:text-slate-500 flex-shrink-0" />
              )}
            </button>
            {reservationsOpen && (
              <div className="ml-3 pl-3 border-l border-slate-200 dark:border-slate-800 space-y-0.5">
                {navItems
                  .filter((i) => i.id === "booking-details")
                  .map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => onSectionChange(item.id)}
                        className={activeSection === item.id ? activeClass : defaultClass}
                      >
                        <Icon size={18} />
                        {item.label}
                      </button>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* Other nav items */}
        {navItems
          .filter((i) => i.id !== "booking-details")
          .map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onSectionChange(item.id)}
                className={activeSection === item.id ? activeClass : defaultClass}
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
      </nav>

      <div className="mt-auto pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-1">
        <button
          onClick={() => onSectionChange("profile")}
          className={activeSection === "profile" ? activeClass : defaultClass}
        >
          <User size={18} />
          Profile
        </button>
        <button
          onClick={toggleTheme}
          className={defaultClass}
        >
          {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          {isDarkMode ? "Light Mode" : "Dark Mode"}
        </button>
      </div>
    </aside>
  );
}
