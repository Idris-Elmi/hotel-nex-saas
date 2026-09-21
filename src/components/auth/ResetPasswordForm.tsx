"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

const MIN_PASSWORD_LENGTH = 8;

export function ResetPasswordForm({ token, from }: { token?: string; from?: string }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const signInUrl = from === "booking" ? "/auth/customer-signin?from=booking" : "/auth/customer-signin";

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Missing or invalid reset token.");
      return;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Password reset failed. Please try again.");
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const inputClasses =
    "w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/40 transition-colors";

  if (success) {
    return (
      <div className="w-full">
        <h1 className="text-center text-2xl font-bold text-slate-900 sm:text-[30px]">Password Updated</h1>
        <p className="mt-3 text-center text-sm text-slate-600">
          Your password has been reset successfully. You can now sign in with your new password.
        </p>
        <Link
          href={signInUrl}
          className="mt-6 flex h-[46px] w-full items-center justify-center rounded-lg bg-[#2563EB] text-sm font-bold text-white transition-colors hover:bg-[#1D4ED8] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8] focus-visible:ring-offset-2"
        >
          Go to Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h1 className="text-center text-2xl font-bold text-slate-900 sm:text-[30px]">Reset Password</h1>
      <p className="mt-2 text-center text-sm text-slate-500">Choose a new password for your account.</p>

      <form onSubmit={submit} className="mt-8 grid gap-4" noValidate={false}>
        <div className="grid gap-1.5">
          <label htmlFor="reset-password" className="text-sm font-semibold text-slate-700">
            New Password
          </label>
          <input
            id="reset-password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            className={inputClasses}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <p className="text-xs text-slate-500">Minimum {MIN_PASSWORD_LENGTH} characters.</p>
        </div>

        <div className="grid gap-1.5">
          <label htmlFor="reset-confirm-password" className="text-sm font-semibold text-slate-700">
            Confirm Password
          </label>
          <input
            id="reset-confirm-password"
            type="password"
            autoComplete="new-password"
            placeholder="Re-enter new password"
            className={inputClasses}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>

        {error ? (
          <p className="text-sm font-medium text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          aria-busy={loading}
          className="flex h-[46px] w-full items-center justify-center rounded-lg bg-[#2563EB] text-sm font-bold text-white transition-colors hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-70 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8] focus-visible:ring-offset-2"
        >
          {loading ? (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden="true" />
          ) : (
            "Reset Password"
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        <Link href={signInUrl} className="font-semibold text-[#2563EB] hover:underline">
          Back to Sign In
        </Link>
      </p>
    </div>
  );
}
