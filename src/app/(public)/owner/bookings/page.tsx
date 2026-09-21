"use client";

import dynamic from "next/dynamic";

const AdminBookingsPage = dynamic(() => import("../../admin/bookings/page"));

export default function OwnerBookingsPage() {
  return <AdminBookingsPage apiBase="/api/owner" />;
}
