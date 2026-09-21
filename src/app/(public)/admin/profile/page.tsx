"use client";

import { RoleGate } from "@/components/auth/RoleGate";
import { ProfilePage } from "@/components/public/profile-page";

export default function AdminProfilePage() {
  return (
    <RoleGate allow={["OWNER", "ADMIN"]}>
      <ProfilePage />
    </RoleGate>
  );
}
