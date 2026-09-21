"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type AllowedRole = "OWNER" | "ADMIN" | "RECEPTIONIST" | "CUSTOMER";

type AuthMeResponse = {
  user?: {
    role?: AllowedRole | "CUSTOMER";
  };
};

export function RoleGate({
  allow,
  loginRoute = "/auth/customer-signin",
  children,
}: {
  allow: AllowedRole[];
  loginRoute?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const currentPath = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
    const loginPath = `${loginRoute}?redirectTo=${encodeURIComponent(currentPath)}`;

    async function run() {
      const staffToken = sessionStorage.getItem("hotel_saas_token_staff")?.trim() ?? "";
      const customerToken = localStorage.getItem("hotel_saas_token")?.trim() ?? "";
      const token = staffToken || customerToken;
      const isStaffToken = Boolean(staffToken);
      if (!token) {
        router.replace(loginPath);
        return;
      }

      const response = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      const payload = (await response.json().catch(() => ({}))) as AuthMeResponse;
      if (!active) {
        return;
      }

      if (!response.ok) {
        if (isStaffToken && response.status === 401) {
          sessionStorage.removeItem("hotel_saas_token_staff");
          localStorage.removeItem("hotel_saas_token_staff");
        } else if (!isStaffToken && response.status === 401) {
          localStorage.removeItem("hotel_saas_token");
        }
        router.replace(loginPath);
        return;
      }

      const role = payload.user?.role;
      if (!role || !allow.includes(role as AllowedRole)) {
        setError("You are not allowed to access this page.");
        setLoading(false);
        return;
      }

      setLoading(false);
    }

    run();
    return () => {
      active = false;
    };
  }, [allow, loginRoute, pathname, router, searchParams]);

  if (loading) {
    return <main className="mx-auto max-w-5xl px-6 py-10 text-sm text-slate-600">Checking access...</main>;
  }

  if (error) {
    return <main className="mx-auto max-w-5xl px-6 py-10 text-sm text-red-700">{error}</main>;
  }

  return <>{children}</>;
}
