import { AdminSidebar } from "@/components/public/admin-sidebar";
import { StaffAuthBar } from "@/components/auth/staff-auth-bar";

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <StaffAuthBar />
      <div className="flex bg-[#F0F4FF] dark:bg-[#070B1A] min-h-screen">
        <AdminSidebar />
        <div className="flex-1 p-6 lg:p-8 overflow-auto text-slate-900 dark:text-slate-100">{children}</div>
      </div>
    </>
  );
}
