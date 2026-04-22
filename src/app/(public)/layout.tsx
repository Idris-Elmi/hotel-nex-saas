import type { Metadata } from "next";
import { SiteNav } from "@/components/public/site-nav";
import { SiteFooter } from "@/components/public/site-footer";

export const metadata: Metadata = {
  title: {
    default: "Aroura Luxury Hotel | Boutique Hotel Experience",
    template: "%s | Aroura Luxury Hotel",
  },
  description: "Discover luxury rooms, modern services, and a seamless online booking flow with real-time availability.",
};

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteNav />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </>
  );
}
