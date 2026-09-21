"use client";

import { useEffect, useRef, useState } from "react";

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function readJwt(): Record<string, unknown> | null {
  if (typeof window === "undefined") return null;
  try {
    const staffToken = sessionStorage.getItem("hotel_saas_token_staff")?.trim() ?? "";
    const customerToken = localStorage.getItem("hotel_saas_token")?.trim() ?? "";
    const token = staffToken || customerToken;
    if (!token) return null;
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function ProfilePage() {
  const claims = readJwt();
  const role = (claims?.role as string) ?? "";
  const tokenEmail = (claims?.email as string) ?? "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [createdAt, setCreatedAt] = useState("");
  const [isActive, setIsActive] = useState(true);

  const currentPwRef = useRef<HTMLInputElement>(null);
  const newPwRef = useRef<HTMLInputElement>(null);
  const confirmPwRef = useRef<HTMLInputElement>(null);

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  function getToken() {
    if (typeof window === "undefined") return "";
    const staffToken = sessionStorage.getItem("hotel_saas_token_staff")?.trim() ?? "";
    const customerToken = localStorage.getItem("hotel_saas_token")?.trim() ?? "";
    return staffToken || customerToken;
  }

  function authHeader(): Record<string, string> {
    const token = getToken().trim();
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/auth/me", { headers: authHeader(), cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message ?? "Failed to load profile");
        setName(data.user?.name ?? "");
        setPhone(data.user?.phone ?? "");
        setEmail(data.user?.email ?? tokenEmail);
        setCreatedAt(data.user?.createdAt ?? "");
        setIsActive(data.user?.isActive ?? true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load profile");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  async function handleSave() {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ name: name.trim(), phone }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message ?? "Failed to update profile");
      setName(data.user?.name ?? name);
      setPhone(data.user?.phone ?? phone);
      setSuccess("Profile updated successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  function validateStrongPassword(pw: string): string | null {
    if (pw.length < 8) return "Password must be at least 8 characters";
    if (!/[a-z]/.test(pw)) return "Password must contain at least one lowercase letter";
    if (!/[A-Z]/.test(pw)) return "Password must contain at least one uppercase letter";
    if (!/[0-9]/.test(pw)) return "Password must contain at least one number";
    if (!/[^a-zA-Z0-9]/.test(pw)) return "Password must contain at least one symbol";
    return null;
  }

  async function handlePasswordUpdate() {
    const current = currentPwRef.current?.value ?? "";
    const newPw = newPwRef.current?.value ?? "";
    const confirm = confirmPwRef.current?.value ?? "";

    if (!current || !newPw || !confirm) {
      setError("All password fields are required");
      return;
    }
    if (newPw !== confirm) {
      setError("New passwords do not match");
      return;
    }
    const pwError = validateStrongPassword(newPw);
    if (pwError) {
      setError(pwError);
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/auth/profile/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ currentPassword: current, newPassword: newPw }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message ?? "Failed to update password");
      if (currentPwRef.current) currentPwRef.current.value = "";
      if (newPwRef.current) newPwRef.current.value = "";
      if (confirmPwRef.current) confirmPwRef.current.value = "";
      setSuccess("Password updated successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setSaving(false);
    }
  }

  const memberSince = createdAt
    ? new Date(createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long" })
    : "";
  const avatarLetter = name ? name.charAt(0).toUpperCase() : "?";

  const roleBadge =
    role === "OWNER" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" :
    role === "ADMIN" ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300" :
    "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";

  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6 bg-[#F0F4FF] dark:bg-[#070B1A] min-h-screen">
        <div className="bg-white dark:bg-[#0F1629] border border-slate-200 dark:border-[#1E2D4A] rounded-2xl p-6 shadow-sm">
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6 bg-[#F0F4FF] dark:bg-[#070B1A] min-h-screen">
      {error ? (
        <p className="rounded-xl bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-red-700 dark:text-red-400">{error}</p>
      ) : null}
      {success ? (
        <p className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">{success}</p>
      ) : null}

      <div className="bg-white dark:bg-[#0F1629] border border-slate-200 dark:border-[#1E2D4A] rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center bg-gradient-to-br from-indigo-500 to-violet-500 text-white text-3xl font-serif font-bold select-none">
            {avatarLetter}
          </div>
          <button className="text-xs text-indigo-500 dark:text-indigo-400 hover:underline cursor-pointer mt-1" onClick={() => {}}>
            Change Photo
          </button>
        </div>
        <div className="flex-1 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <h1 className="text-2xl font-serif font-bold text-slate-900 dark:text-slate-100">{name}</h1>
            <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase inline-block w-fit ${roleBadge}`}>
              {role}
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{email}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Member since {memberSince}</p>
          <div className="flex items-center gap-1.5 mt-2 justify-center sm:justify-start">
            <span className={`w-2 h-2 rounded-full ${isActive ? "bg-emerald-500" : "bg-slate-300"}`} />
            <span className={`text-xs ${isActive ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500"}`}>
              {isActive ? "Active Account" : "Inactive"}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-[#0F1629] border border-slate-200 dark:border-[#1E2D4A] rounded-2xl p-6 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-5">Edit Profile</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-[#1A2540] border border-slate-200 dark:border-[#252D47] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 dark:focus:border-indigo-500 transition-all duration-200"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-[#1A2540] border border-slate-200 dark:border-[#252D47] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 dark:focus:border-indigo-500 transition-all duration-200"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Email</label>
            <div className="w-full px-4 py-2.5 rounded-xl text-sm bg-slate-100 dark:bg-[#141E35] border border-slate-200 dark:border-[#252D47] text-slate-500 dark:text-slate-400 cursor-not-allowed flex items-center gap-1.5">
              <LockIcon className="opacity-40 shrink-0" />
              <span>{email}</span>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Role</label>
            <div className="w-full px-4 py-2.5 rounded-xl text-sm bg-slate-100 dark:bg-[#141E35] border border-slate-200 dark:border-[#252D47] text-slate-500 dark:text-slate-400 cursor-not-allowed flex items-center gap-1.5">
              <LockIcon className="opacity-40 shrink-0" />
              <span>{role}</span>
            </div>
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Member Since</label>
            <div className="w-full px-4 py-2.5 rounded-xl text-sm bg-slate-100 dark:bg-[#141E35] border border-slate-200 dark:border-[#252D47] text-slate-500 dark:text-slate-400 cursor-not-allowed flex items-center gap-1.5">
              <LockIcon className="opacity-40 shrink-0" />
              <span>{memberSince}</span>
            </div>
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <button
            className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] transition-all duration-200 shadow-sm disabled:opacity-60"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-[#0F1629] border border-slate-200 dark:border-[#1E2D4A] rounded-2xl p-6 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-5">Security</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Current Password</label>
            <div className="relative">
              <input
                ref={currentPwRef}
                type={showCurrent ? "text" : "password"}
                placeholder="Enter current password"
                className="w-full px-4 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-[#1A2540] border border-slate-200 dark:border-[#252D47] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 dark:focus:border-indigo-500 transition-all duration-200 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer"
              >
                {showCurrent ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-600 dark:text-slate-400">New Password</label>
            <div className="relative">
              <input
                ref={newPwRef}
                type={showNew ? "text" : "password"}
                placeholder="Enter new password"
                className="w-full px-4 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-[#1A2540] border border-slate-200 dark:border-[#252D47] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 dark:focus:border-indigo-500 transition-all duration-200 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer"
              >
                {showNew ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            <span className="text-xs text-slate-400">Must be 8+ characters with uppercase, lowercase, number, and symbol</span>
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Confirm New Password</label>
            <div className="relative">
              <input
                ref={confirmPwRef}
                type={showConfirm ? "text" : "password"}
                placeholder="Confirm new password"
                className="w-full px-4 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-[#1A2540] border border-slate-200 dark:border-[#252D47] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 dark:focus:border-indigo-500 transition-all duration-200 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer"
              >
                {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <button
            className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-600 active:scale-[0.99] transition-all duration-200 shadow-sm disabled:opacity-60"
            onClick={handlePasswordUpdate}
            disabled={saving}
          >
            {saving ? "Updating..." : "Update Password"}
          </button>
        </div>
      </div>
    </div>
  );
}
