import dynamic from "next/dynamic";

const AdminCustomerDetailPage = dynamic(() => import("../../../admin/bookings/customer-details/page"));

export default function OwnerCustomerDetailPage() {
  return <AdminCustomerDetailPage apiBase="/api/owner" />;
}
