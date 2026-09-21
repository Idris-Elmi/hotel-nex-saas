import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

type SearchParams = Promise<{ token?: string; from?: string }>;

export default async function ResetPasswordPage({ searchParams }: { searchParams: SearchParams }) {
  const search = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-linear-to-b from-[#EFF4F8] to-[#E2EAF2] px-4 py-10">
      <div className="w-[92vw] min-[480px]:w-[400px] sm:w-[420px] rounded-2xl bg-white px-5 py-7 shadow-xl shadow-slate-200/60 sm:px-8 sm:py-10">
        <Suspense fallback={<p className="text-center text-sm text-slate-500">Loading...</p>}>
          <ResetPasswordForm token={search.token} from={search.from} />
        </Suspense>
      </div>
    </main>
  );
}
