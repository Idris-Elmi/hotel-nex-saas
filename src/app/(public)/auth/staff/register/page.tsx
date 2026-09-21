import Link from "next/link";
import { AuthForm } from "@/components/auth/AuthForm";

export default function StaffRegisterPage() {
  return (
    <main className="mx-auto max-w-xl px-6 py-10">
      <h1 className="mb-3 text-3xl font-black text-slate-900">Staff Register</h1>
      <p className="mb-6 text-slate-600">Create OWNER, ADMIN, or RECEPTIONIST account for hotel operations.</p>
      <AuthForm mode="register" allowRegister staffOnly />
      <p className="mt-4 text-sm text-slate-600">
        Already registered? <Link href="/auth/staff-signin" className="font-semibold text-slate-900">Sign in</Link>
      </p>
    </main>
  );
}
