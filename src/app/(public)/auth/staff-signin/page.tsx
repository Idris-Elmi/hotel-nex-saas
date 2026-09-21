import Link from "next/link";
import { AuthForm } from "@/components/auth/AuthForm";

type SearchParams = Promise<{ redirectTo?: string }>;

export default async function StaffSignInPage({ searchParams }: { searchParams: SearchParams }) {
  const search = await searchParams;

  return (
    <main className="mx-auto max-w-xl px-6 py-10">
      <h1 className="mb-3 text-3xl font-black text-slate-900">Staff Sign In</h1>
      <p className="mb-6 text-slate-600">Sign in as OWNER, ADMIN, or RECEPTIONIST to access staff dashboards.</p>
      <AuthForm mode="login" redirectTo={search.redirectTo} staffOnly />
      <p className="mt-4 text-sm text-slate-600">
        Need a staff account? <Link href="/auth/staff/register" className="font-semibold text-slate-900">Register</Link>
      </p>
    </main>
  );
}
