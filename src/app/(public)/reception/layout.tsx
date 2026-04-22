import { StaffAuthBar } from "@/components/auth/staff-auth-bar";

export default function ReceptionLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <StaffAuthBar />
      <div className="pt-16">{children}</div>
    </>
  );
}
