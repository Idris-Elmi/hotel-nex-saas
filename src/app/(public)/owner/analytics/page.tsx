"use client";

import dynamic from "next/dynamic";

const AdminAnalyticsPage = dynamic(() => import("../../admin/analytics/page"));

export default function OwnerAnalyticsPage() {
  return <AdminAnalyticsPage apiBase="/api/owner" />;
}
