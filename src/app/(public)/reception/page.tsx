"use client";

import { useState } from "react";
import { RoleGate } from "@/components/auth/RoleGate";
import Sidebar from "@/components/reception/Sidebar";
import BookingDetailsSection from "@/components/reception/BookingDetailsSection";
import RoomAvailabilitySection from "@/components/reception/RoomAvailabilitySection";
import PaymentSubmissionSection from "@/components/reception/PaymentSubmissionSection";
import WalkInBookingSection from "@/components/reception/WalkInBookingSection";
import ManageBookingSection from "@/components/reception/ManageBookingSection";
import ProfileSection from "@/components/reception/ProfileSection";

export default function ReceptionPage() {
  return (
    <RoleGate allow={["RECEPTIONIST", "ADMIN"]} loginRoute="/auth/staff-signin">
      <ReceptionContent />
    </RoleGate>
  );
}

function ReceptionContent() {
  const [activeSection, setActiveSection] = useState("booking-details");
  const [sharedBookingId, setSharedBookingId] = useState("");
  const [pendingRoomNumber, setPendingRoomNumber] = useState("");

  function renderSection() {
    switch (activeSection) {
      case "booking-details":
        return <BookingDetailsSection />;
      case "availability":
        return <RoomAvailabilitySection onRoomSelected={(room) => { setPendingRoomNumber(room); setActiveSection("walk-in"); }} />;
      case "payment":
        return <PaymentSubmissionSection externalBookingId={sharedBookingId} />;
      case "walk-in":
        return <WalkInBookingSection initialRoomNumber={pendingRoomNumber} onBookingCreated={(id) => setSharedBookingId(id)} />;
      case "manage-booking":
        return <ManageBookingSection externalBookingId={sharedBookingId} />;
      case "profile":
        return <ProfileSection />;
      default:
        return <BookingDetailsSection />;
    }
  }

  return (
    <>
      <Sidebar activeSection={activeSection} onSectionChange={setActiveSection} />
      <main className="flex-1 p-6 lg:p-8 space-y-6 min-h-screen bg-slate-50 dark:bg-[#0B1120]">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100">Reception Desk</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">All reception tools in one place: booking details, availability, walk-in, and booking management.</p>
        </div>
        {renderSection()}
      </main>
    </>
  );
}
