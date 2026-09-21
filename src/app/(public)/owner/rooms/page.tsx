"use client";

import dynamic from "next/dynamic";

const AdminRoomsPage = dynamic(() => import("../../admin/rooms/page"));

export default function OwnerRoomsPage() {
  return <AdminRoomsPage apiBase="/api/owner" />;
}
