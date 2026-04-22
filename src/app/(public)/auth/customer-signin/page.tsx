import { AuthForm } from "@/components/auth/AuthForm";

type SearchParams = Promise<{ redirectTo?: string }>;

export default async function CustomerSignInPage({ searchParams }: { searchParams: SearchParams }) {
  const search = await searchParams;

  return (
    <main className="mx-auto max-w-xl px-6 py-10">
      <h1 className="mb-3 text-3xl font-black text-slate-900">Customer Sign In</h1>
      <p className="mb-6 text-slate-600">Sign in with your customer account to access bookings and profile.</p>
      <AuthForm mode="login" redirectTo={search.redirectTo} customerOnly />
    </main>
  );
}
