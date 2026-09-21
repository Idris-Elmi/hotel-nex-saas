"use client";

import dynamic from "next/dynamic";

const AdminPaymentsPage = dynamic(() => import("../../admin/payments/page"));

export default function OwnerPaymentsPage() {
  return <AdminPaymentsPage apiBase="/api/owner" />;
}
