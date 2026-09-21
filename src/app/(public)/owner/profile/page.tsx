"use client";

import { RoleGate } from "@/components/auth/RoleGate";
import { ProfilePage } from "@/components/public/profile-page";

export default function OwnerProfilePage() {
  return (
    <RoleGate allow={["OWNER"]}>
      <ProfilePage />
    </RoleGate>
  );
}
