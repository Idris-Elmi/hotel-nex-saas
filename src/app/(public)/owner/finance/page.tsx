"use client";

import dynamic from "next/dynamic";

const AdminFinancePage = dynamic(() => import("../../admin/finance/page"));

export default function OwnerFinancePage() {
  return <AdminFinancePage apiBase="/api/owner" />;
}
