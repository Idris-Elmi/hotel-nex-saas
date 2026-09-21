import { StaffAuthBar } from "@/components/auth/staff-auth-bar";

export default function ReceptionLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120] font-sans">
      <StaffAuthBar />
      <div className="flex">
        {children}
      </div>
    </div>
  );
}
