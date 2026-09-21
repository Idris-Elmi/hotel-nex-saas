"use client";

import { useEffect, useState } from "react";
import { User } from "lucide-react";

export default function ProfileSection() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [gender, setGender] = useState("");
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  const inputClass =
    "w-full px-4 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-all duration-200";
  const selectClass = inputClass;
  const cardClass =
    "rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-5 shadow-sm transition-all duration-200";
  const btnClass =
    "rounded-xl bg-slate-900 dark:bg-slate-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 dark:hover:bg-slate-600 disabled:opacity-60 transition-all duration-200 active:scale-[0.99]";

  function getToken() {
    return sessionStorage.getItem("hotel_saas_token_staff")?.trim() ?? "";
  }

  useEffect(() => {
    const token = getToken();
    fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        const u = data.user ?? data;
        setProfile(u);
        setName(u.name || "");
        setPhone(u.phone || "");
        setAddress(u.address || "");
        setGender(u.gender || "");
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    const token = getToken();
    const res = await fetch("/api/auth/profile", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name, phone, address, gender }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setSaveError(data.message || data.error || "Failed to save");
      return;
    }
    const u = data.user ?? data;
    setProfile(u);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  }

  function validateStrongPassword(pw: string): string | null {
    if (pw.length < 8) return "Password must be at least 8 characters";
    if (!/[a-z]/.test(pw)) return "Password must contain at least one lowercase letter";
    if (!/[A-Z]/.test(pw)) return "Password must contain at least one uppercase letter";
    if (!/[0-9]/.test(pw)) return "Password must contain at least one number";
    if (!/[^a-zA-Z0-9]/.test(pw)) return "Password must contain at least one symbol";
    return null;
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPw !== confirmPw) {
      setPwError("Passwords do not match");
      return;
    }
    const pwValidation = validateStrongPassword(newPw);
    if (pwValidation) {
      setPwError(pwValidation);
      return;
    }
    setPwSaving(true);
    setPwError(null);
    setPwSuccess(false);
    const token = getToken();
    const res = await fetch("/api/auth/profile/password", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
    });
    const data = await res.json();
    setPwSaving(false);
    if (!res.ok) {
      setPwError(data.message || data.error || "Failed to update");
      return;
    }
    setPwSuccess(true);
    setCurrentPw("");
    setNewPw("");
    setConfirmPw("");
    setTimeout(() => setPwSuccess(false), 3000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 dark:border-slate-600 border-t-indigo-500" />
      </div>
    );
  }

  const firstLetter = (profile?.name || "U").charAt(0).toUpperCase();

  return (
    <div className="space-y-6">
      <div className={cardClass}>
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-xl font-bold text-white shadow-md">
            {firstLetter}
          </div>
          <div>
            <p className="text-xl font-serif font-bold text-slate-900 dark:text-slate-100">
              {profile?.name}
            </p>
            <span className="inline-block rounded-full bg-teal-100 dark:bg-teal-900/30 px-3 py-0.5 text-xs font-semibold text-teal-700 dark:text-teal-400">
              RECEPTIONIST
            </span>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {profile?.email}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSaveProfile} className={cardClass + " space-y-4"}>
        <h3 className="text-lg font-serif font-semibold text-slate-900 dark:text-slate-100">
          Edit Profile
        </h3>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Name</span>
          <input
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Phone</span>
          <input
            className={inputClass}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Address</span>
          <input
            className={inputClass}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Gender</span>
          <select
            className={selectClass}
            value={gender}
            onChange={(e) => setGender(e.target.value)}
          >
            <option value="">Not specified</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </label>

        <button className={btnClass + " w-full"} type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save Profile"}
        </button>

        {saveSuccess && (
          <p className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2.5 text-sm text-emerald-700 dark:text-emerald-400">
            Profile updated
          </p>
        )}
        {saveError && (
          <p className="text-sm text-red-500">{saveError}</p>
        )}
      </form>

      <form onSubmit={handleChangePassword} className={cardClass + " space-y-4"}>
        <h3 className="text-lg font-serif font-semibold text-slate-900 dark:text-slate-100">
          Change Password
        </h3>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Current Password</span>
          <div className="relative">
            <input
              className={inputClass + " pr-10"}
              type={showCurrentPw ? "text" : "password"}
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowCurrentPw((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer"
            >
              {showCurrentPw ? (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
              )}
            </button>
          </div>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">New Password</span>
          <div className="relative">
            <input
              className={inputClass + " pr-10"}
              type={showNewPw ? "text" : "password"}
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowNewPw((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer"
            >
              {showNewPw ? (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
              )}
            </button>
          </div>
          <span className="text-xs text-slate-400">Must be 8+ characters with uppercase, lowercase, number, and symbol</span>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Confirm New Password</span>
          <div className="relative">
            <input
              className={inputClass + " pr-10"}
              type={showConfirmPw ? "text" : "password"}
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPw((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer"
            >
              {showConfirmPw ? (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
              )}
            </button>
          </div>
        </label>

        <button className={btnClass + " w-full"} type="submit" disabled={pwSaving}>
          {pwSaving ? "Updating..." : "Update Password"}
        </button>

        {pwSuccess && (
          <p className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2.5 text-sm text-emerald-700 dark:text-emerald-400">
            Password updated
          </p>
        )}
        {pwError && (
          <p className="text-sm text-red-500">{pwError}</p>
        )}
      </form>

      <div className={cardClass + " space-y-2"}>
        <h3 className="text-lg font-serif font-semibold text-slate-900 dark:text-slate-100">
          Account Info
        </h3>
        <p className="text-sm text-slate-700 dark:text-slate-300">
          <span className="font-medium text-slate-500 dark:text-slate-400">Email:</span>{" "}
          {profile?.email}
        </p>
        <p className="text-sm text-slate-700 dark:text-slate-300">
          <span className="font-medium text-slate-500 dark:text-slate-400">Role:</span>{" "}
          {profile?.role}
        </p>
        <p className="text-sm text-slate-700 dark:text-slate-300">
          <span className="font-medium text-slate-500 dark:text-slate-400">Member since:</span>{" "}
          {profile?.createdAt
            ? new Date(profile.createdAt).toLocaleDateString()
            : "N/A"}
        </p>
      </div>
    </div>
  );
}
