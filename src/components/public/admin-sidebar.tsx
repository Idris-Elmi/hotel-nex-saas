"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ADMIN_LINKS = [
  {
    label: "Analytics",
    href: "/admin/analytics",
    urlHint: "/admin/analytics",
  },
  {
    label: "Room Management",
    href: "/admin/rooms",
    urlHint: "/admin/rooms",
  },
  {
    label: "Payments",
    href: "/admin/payments",
    urlHint: "/admin/payments",
  },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-24">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Admin Menu</p>
      <nav className="mt-3 grid gap-2">
        {ADMIN_LINKS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-xl border px-3 py-3 transition ${
                active
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
              }`}
            >
              <p className="text-sm font-semibold">{item.label}</p>
              <p className={`text-xs ${active ? "text-slate-200" : "text-slate-500"}`}>{item.urlHint}</p>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
