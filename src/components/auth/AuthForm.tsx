"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type AuthFormMode = "login" | "register";

function sanitizeRedirect(path: string | undefined): string | null {
  if (!path) {
    return null;
  }

  if (!path.startsWith("/")) {
    return null;
  }

  if (path.startsWith("//")) {
    return null;
  }

  return path;
}

export function AuthForm({
  mode,
  redirectTo,
  customerOnly = false,
  staffOnly = false,
  allowRegister = false,
}: {
  mode: AuthFormMode;
  redirectTo?: string;
  customerOnly?: boolean;
  staffOnly?: boolean;
  allowRegister?: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("RECEPTIONIST");
  const [phone, setPhone] = useState("");
  const [passportDocumentUrl, setPassportDocumentUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const safeRedirect = sanitizeRedirect(redirectTo);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (mode === "register" && !allowRegister) {
      setLoading(false);
      setError("Registration is disabled. Please use Sign In.");
      return;
    }

    const endpoint = mode === "register" ? "/api/auth/register" : "/api/auth/login";
    const payload =
      mode === "register"
        ? { name, email, password, role, phone, passportDocumentUrl }
        : { email, password };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "include",
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      const details = data?.details;
      if (details?.fieldErrors) {
        const msgs: string[] = [];
        for (const [field, errors] of Object.entries(details.fieldErrors as Record<string, string[]>)) {
          msgs.push(`${field}: ${errors.join(", ")}`);
        }
        setError(msgs.join(" | "));
      } else {
        setError(data.message ?? "Authentication failed");
      }
      return;
    }

    const userRole = data?.user?.role;
    if (customerOnly && userRole !== "CUSTOMER") {
      setError("Only customer accounts are allowed for this sign-in.");
      return;
    }

    if (data.accessToken) {
      if (staffOnly) {
        sessionStorage.setItem("hotel_saas_token_staff", data.accessToken);
        localStorage.setItem("hotel_saas_token_staff", data.accessToken);
      } else {
        localStorage.setItem("hotel_saas_token", data.accessToken);
      }
    }

    if (customerOnly) {
      router.replace(safeRedirect ?? "/customer/dashboard");
      return;
    }

    if (staffOnly && userRole !== "OWNER" && userRole !== "ADMIN" && userRole !== "RECEPTIONIST") {
      setError("Only staff accounts are allowed for this sign-in.");
      return;
    }

    if (userRole === "OWNER") {
      const ownerRedirect = staffOnly && !safeRedirect?.startsWith("/owner") ? "/owner/analytics" : (safeRedirect ?? "/owner/analytics");
      router.push(ownerRedirect);
      return;
    }

    if (userRole === "ADMIN") {
      const adminRedirect = staffOnly && !safeRedirect?.startsWith("/admin") ? "/admin/analytics" : (safeRedirect ?? "/admin/analytics");
      router.push(adminRedirect);
      return;
    }

    if (userRole === "RECEPTIONIST") {
      const receptionRedirect =
        staffOnly && !(safeRedirect?.startsWith("/reception") || safeRedirect?.startsWith("/admin"))
          ? "/reception/dashboard"
          : (safeRedirect ?? "/reception/dashboard");
      router.push(receptionRedirect);
      return;
    }

    const customerRedirect = safeRedirect?.startsWith("/customer") ? safeRedirect : "/customer";
    router.push(customerRedirect);
  }

  return (
    <form onSubmit={submit} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {mode === "register" ? (
        <>
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Name
            <input className="rounded-xl border border-slate-300 px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} required />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Role
            <select className="rounded-xl border border-slate-300 px-3 py-2" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="OWNER">OWNER</option>
              <option value="ADMIN">ADMIN</option>
              <option value="RECEPTIONIST">RECEPTIONIST</option>
            </select>
          </label>

          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Phone
            <input className="rounded-xl border border-slate-300 px-3 py-2" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1234567890" />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Passport/ID URL
            <input
              className="rounded-xl border border-slate-300 px-3 py-2"
              value={passportDocumentUrl}
              onChange={(e) => setPassportDocumentUrl(e.target.value)}
              placeholder="/uploads/ids/file.jpg"
            />
          </label>
        </>
      ) : null}

      <label className="grid gap-2 text-sm font-semibold text-slate-700">
        Email
        <input className="rounded-xl border border-slate-300 px-3 py-2" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </label>

      <label className="grid gap-2 text-sm font-semibold text-slate-700">
        Password
        <input className="rounded-xl border border-slate-300 px-3 py-2" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {mode === "register" ? (
          <span className="text-xs text-slate-400 font-normal">Must be 8+ characters with uppercase, lowercase, number, and symbol</span>
        ) : null}
      </label>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button className="rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white disabled:opacity-60" type="submit" disabled={loading}>
        {loading ? "Please wait..." : mode === "register" ? "Create Account" : "Sign In"}
      </button>
    </form>
  );
}
