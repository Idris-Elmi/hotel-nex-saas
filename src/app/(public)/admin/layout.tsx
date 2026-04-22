import { AdminSidebar } from "@/components/public/admin-sidebar";
import { StaffAuthBar } from "@/components/auth/staff-auth-bar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <StaffAuthBar />
      <div className="mx-auto max-w-7xl px-4 pb-8 pt-24 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <AdminSidebar />
          <div>{children}</div>
        </div>
      </div>
    </>
  );
}
