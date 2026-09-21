"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

const SUCCESS_MESSAGE = "If an account exists for this email, a password reset link has been sent.";

export function ForgotPasswordForm({ from }: { from?: string }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [devResetUrl, setDevResetUrl] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setDevResetUrl("");

    if (!email.trim()) {
      setError("Email is required.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      setSuccess(SUCCESS_MESSAGE);

      if (data.resetUrl) {
        const url = new URL(data.resetUrl, window.location.origin);
        if (from) {
          url.searchParams.set("from", from);
        }
        setDevResetUrl(url.toString());
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const inputClasses =
    "w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/40 transition-colors";

  return (
    <div className="w-full">
      <h1 className="text-center text-2xl font-bold text-slate-900 sm:text-[30px]">Forgot Password</h1>
      <p className="mt-2 text-center text-sm text-slate-500">
        Enter your account email and we will send you a password reset link.
      </p>

      <form onSubmit={submit} className="mt-8 grid gap-4">
        <div className="grid gap-1.5">
          <label htmlFor="forgot-email" className="text-sm font-semibold text-slate-700">
            Email
          </label>
          <input
            id="forgot-email"
            type="email"
            autoComplete="email"
            placeholder="Email Address"
            className={inputClasses}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        {error ? (
          <p className="text-sm font-medium text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        {success ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-3">
            <p className="text-sm font-medium text-emerald-700">{success}</p>
            {devResetUrl ? (
              <a
                href={devResetUrl}
                className="mt-2 inline-block text-sm font-semibold text-[#2563EB] hover:underline"
              >
                Open reset link (development only)
              </a>
            ) : null}
          </div>
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
            "Send Reset Link"
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Remembered your password?{" "}
        <Link
          href={from === "booking" ? "/auth/customer-signin?from=booking" : "/auth/customer-signin"}
          className="font-semibold text-[#2563EB] hover:underline"
        >
          Back to Sign In
        </Link>
      </p>
    </div>
  );
}
