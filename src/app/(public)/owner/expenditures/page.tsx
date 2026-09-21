"use client";

import dynamic from "next/dynamic";

const AdminExpendituresPage = dynamic(() => import("../../admin/expenditures/page"));

export default function OwnerExpendituresPage() {
  return <AdminExpendituresPage apiBase="/api/owner" />;
}
