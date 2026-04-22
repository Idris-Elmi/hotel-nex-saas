import { CustomerShell } from "@/components/auth/customer-shell";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return <CustomerShell>{children}</CustomerShell>;
}
