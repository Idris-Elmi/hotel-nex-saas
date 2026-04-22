import { redirect } from "next/navigation";

type SearchParams = Promise<{ redirectTo?: string }>;

export default async function StaffLoginPage({ searchParams }: { searchParams: SearchParams }) {
  const search = await searchParams;
  const query = search.redirectTo ? `?redirectTo=${encodeURIComponent(search.redirectTo)}` : "";
  redirect(`/auth/staff-signin${query}`);
}
