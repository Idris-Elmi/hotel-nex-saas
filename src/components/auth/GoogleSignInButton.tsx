"use client";

import { signIn } from "next-auth/react";
import { FcGoogle } from "react-icons/fc";

export function GoogleSignInButton({
  callbackUrl = "/",
  className = "",
}: {
  callbackUrl?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => signIn("google", { callbackUrl })}
      className={`flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 active:scale-[0.98] ${className}`}
    >
      <FcGoogle size={18} />
      Continue with Google
    </button>
  );
}
