"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight, CalendarRange } from "lucide-react";

function SvgIcon({ children, className }: { children: ReactNode; className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="17" height="17">{children}</svg>;
}

const I = {
  Dashboard:     <SvgIcon><rect x="3" y="3" width="7" height="9" /><rect x="14" y="3" width="7" height="5" /><rect x="14" y="12" width="7" height="9" /><rect x="3" y="16" width="7" height="5" /></SvgIcon>,
  Analytics:     <SvgIcon><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></SvgIcon>,
  Bed:           <SvgIcon><path d="M3 7v11a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7" /><path d="M21 7H3l2-4h14l2 4Z" /><path d="M17 11v4" /><path d="M7 11v4" /><circle cx="12" cy="8" r="1" /></SvgIcon>,
  Calendar:      <SvgIcon><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></SvgIcon>,
  Card:          <SvgIcon><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></SvgIcon>,
  Users:         <SvgIcon><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></SvgIcon>,
  TrendingUp:    <SvgIcon><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></SvgIcon>,
  Receipt:       <SvgIcon><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" /><path d="M8 7h8" /><path d="M8 11h6" /><path d="M8 15h4" /></SvgIcon>,
  Sun:           <SvgIcon><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" /></SvgIcon>,
  Moon:          <SvgIcon><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></SvgIcon>,
  UserCircle:    <SvgIcon><circle cx="12" cy="12" r="10" /><circle cx="12" cy="10" r="3" /><path d="M6.168 18.849A4 4 0 0 1 10 16h4a4 4 0 0 1 3.832 2.849" /></SvgIcon>,
} as const;

type NavIcon = keyof typeof I;

type NavItem = { label: string; href: string; icon: NavIcon; iconColor?: string };

const OWNER_NAV: { group: string; items: NavItem[] }[] = [
  { group: "OVERVIEW", items: [{ label: "Dashboard", href: "/owner/dashboard", icon: "Dashboard" }] },
  {
    group: "PERFORMANCE",
    items: [
      { label: "Analytics", href: "/owner/analytics", icon: "Analytics" },
      { label: "Finance", href: "/owner/finance", icon: "TrendingUp", iconColor: "text-teal-500 dark:text-teal-400" },
      { label: "Expenditure", href: "/owner/expenditures", icon: "Receipt", iconColor: "text-rose-500 dark:text-rose-400" },
    ],
  },
  {
    group: "RESERVATIONS",
    items: [
      { label: "Booking Management", href: "/owner/bookings", icon: "Calendar" },
      { label: "Customer Booking Details", href: "/owner/bookings/customer-details", icon: "Calendar" },
    ],
  },
  {
    group: "OPERATIONS",
    items: [
      { label: "Room Management", href: "/owner/rooms", icon: "Bed" },
      { label: "Payment", href: "/owner/payments", icon: "Card" },
    ],
  },
  {
    group: "PEOPLE",
    items: [{ label: "Staff Management", href: "/owner/staff", icon: "Users" }],
  },
  {
    group: "PROFILE",
    items: [{ label: "Profile", href: "/owner/profile", icon: "UserCircle" }],
  },
];

const ADMIN_NAV: { group: string; items: NavItem[] }[] = [
  { group: "OVERVIEW", items: [{ label: "Dashboard", href: "/admin/dashboard", icon: "Dashboard" }] },
  {
    group: "PERFORMANCE",
    items: [{ label: "Analytics", href: "/admin/analytics", icon: "Analytics" }],
  },
  {
    group: "RESERVATIONS",
    items: [
      { label: "Booking Management", href: "/admin/bookings", icon: "Calendar" },
      { label: "Customer Booking Details", href: "/admin/bookings/customer-details", icon: "Calendar" },
    ],
  },
  {
    group: "OPERATIONS",
    items: [
      { label: "Room Management", href: "/admin/rooms", icon: "Bed" },
      { label: "Payment", href: "/admin/payments", icon: "Card" },
    ],
  },

  {
    group: "PROFILE",
    items: [{ label: "Profile", href: "/admin/profile", icon: "UserCircle" }],
  },
];

function readRole(): string | null {
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

export function AdminSidebar() {
  const pathname = usePathname();
  const [dark, setDark] = useState(false);
  const [reservationsOpen, setReservationsOpen] = useState(true);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
    setAuthReady(true);
  }, []);

  useEffect(() => {
    if (pathname.includes("/bookings")) setReservationsOpen(true);
  }, [pathname]);

  const role = authReady ? readRole() : null;
  const nav = role === "OWNER" ? OWNER_NAV : role === "ADMIN" ? ADMIN_NAV : [];

  function toggleDark() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  function isActive(href: string) {
    return pathname === href;
  }

  return (
    <aside className="w-64 h-screen sticky top-16 flex flex-col bg-white dark:bg-[#0D1225] border-r border-slate-200 dark:border-[#1E2D4A] py-5 px-3 overflow-y-auto">
      <nav className="flex-1 space-y-1">
        {nav.map((group) => {
          const renderItems = () =>
            group.items.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl w-full text-left text-sm font-medium transition-all duration-200 ${
                    active
                      ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-semibold shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-700 dark:hover:text-indigo-300"
                  }`}
                >
                  <span className={`shrink-0 ${item.iconColor ?? ""}`}>{I[item.icon]}</span>
                  <span>{item.label}</span>
                </Link>
              );
            });

          return (
            <div key={group.group}>
              {group.group === "RESERVATIONS" ? (
                <>
                  <button
                    onClick={() => setReservationsOpen((prev) => !prev)}
                    className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl w-full text-left text-sm font-medium transition-all duration-200 text-slate-600 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-700 dark:hover:text-indigo-300 cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <CalendarRange size={17} className="shrink-0" />
                      <span>Reservations</span>
                    </div>
                    {reservationsOpen ? (
                      <ChevronDown size={14} className="text-slate-400 dark:text-slate-500 flex-shrink-0" />
                    ) : (
                      <ChevronRight size={14} className="text-slate-400 dark:text-slate-500 flex-shrink-0" />
                    )}
                  </button>
                  {reservationsOpen && (
                    <div className="ml-3 pl-3 border-l border-slate-200 dark:border-[#1E2D4A] space-y-0.5">
                      {renderItems()}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <p className="text-[10px] font-bold tracking-widest text-slate-400 dark:text-slate-600 px-4 mb-1 mt-2">
                    {group.group}
                  </p>
                  {renderItems()}
                </>
              )}
            </div>
          );
        })}
      </nav>

      <div className="mt-auto pt-4 border-t border-slate-200 dark:border-[#1E2D4A]">
        <button
          onClick={toggleDark}
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl w-full text-left text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200"
        >
          {dark ? I["Moon"] : I["Sun"]}
          <span>{dark ? "Dark Mode" : "Light Mode"}</span>
        </button>
      </div>
    </aside>
  );
}
