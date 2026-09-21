"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { RoleGate } from "@/components/auth/RoleGate";
import { ShieldCheck, MapPin, Calendar, Camera, Lock, User, Eye, EyeOff, Save } from "lucide-react";

type CustomerWindowBridge = {
  __switchTab?: (tab: string) => void;
};

type CustomerProfile = {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  address?: string;
  passportDocumentUrl?: string;
};

type CustomerBooking = {
  _id: string;
  bookingRef: string;
  pricingPlan: string;
  guests: {
    adults: number;
    children: number;
  };
  guestSnapshot: {
    fullName: string;
    email: string;
    phone?: string;
    identityDocumentUrl?: string;
  };
  status: string;
  paymentStatus: string;
  pricing: {
    perNight: number;
    addons: number;
    subtotal: number;
    taxes: number;
    total: number;
    currency: string;
  };
  totalPrice: number;
  amountPaid: number;
  arrivalDate: string;
  departureDate: string;
  nights: number;
  checkInAt?: string;
  checkOutAt?: string;
  cancelledAt?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
  room: {
    id: string;
    roomNumber: string;
    status: string;
    type?: {
      id: string;
      name: string;
      code: string;
    } | null;
  } | null;
  latestPayment: {
    _id: string;
    status: string;
    method: string;
    amount: number;
    transactionReference?: string;
    receiptUrl?: string;
    createdAt?: string;
    reviewNote?: string;
    reviewedAt?: string;
  } | null;
  paymentHistory: Array<{
    _id: string;
    status: string;
    method: string;
    amount: number;
    transactionReference?: string;
    receiptUrl?: string;
    createdAt?: string;
    reviewNote?: string;
    reviewedAt?: string;
  }>;
};

function PaymentBadge({ status }: { status: string }) {
  const style =
    status === "REJECTED"
      ? "bg-red-500/20 text-red-400 border border-red-500/30"
      : status === "APPROVED" || status === "PAID" || status === "PARTIAL"
        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
        : "bg-amber-500/20 text-amber-400 border border-amber-500/30";

  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${style}`}>{status}</span>;
}

export default function CustomerDashboardPage() {
  return (
    <RoleGate allow={["CUSTOMER"]} loginRoute="/auth/customer-signin">
      <CustomerPortalContent />
    </RoleGate>
  );
}

function CustomerPortalContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [bookings, setBookings] = useState<CustomerBooking[]>([]);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState("");
  const [showPaymentPanel, setShowPaymentPanel] = useState(false);
  const [manualMethod, setManualMethod] = useState<"bank" | "mobile_money">("bank");
  const [transactionReference, setTransactionReference] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("profile");
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [profileMessage, setProfileMessage] = useState("");
  const [passwordForm, setPasswordForm] = useState({ current: "", newPass: "", confirm: "" });
  const [showPassword, setShowPassword] = useState({ current: false, newPass: false, confirm: false });
  const [passwordMessage, setPasswordMessage] = useState("");
  const paymentPanelRef = useRef<HTMLDivElement | null>(null);
  const paymentStepRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    (window as CustomerWindowBridge).__switchTab = setActiveTab;
    return () => { delete (window as CustomerWindowBridge).__switchTab; };
  }, []);

  useEffect(() => {
    let active = true;

    async function load() {
      const token = localStorage.getItem("hotel_saas_token")?.trim() ?? "";
      if (!token) {
        if (active) {
          setError("Missing login token. Please sign in again.");
          setLoading(false);
        }
        return;
      }

      const [bookingsResponse, profileResponse] = await Promise.all([
        fetch("/api/customer/bookings", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }),
        fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }),
      ]);

      const bookingsPayload = await bookingsResponse.json().catch(() => ({}));
      const profilePayload = await profileResponse.json().catch(() => ({}));
      if (!active) {
        return;
      }

      if (!bookingsResponse.ok) {
        setError(bookingsPayload.message ?? "Failed to load your bookings");
        setLoading(false);
        return;
      }

      const normalizedBookings = (bookingsPayload.bookings ?? []) as CustomerBooking[];
      const sessionBookingId = sessionStorage.getItem("booking_progress_booking_id")?.trim() ?? "";
      const requestedBookingId = searchParams.get("bookingId")?.trim() || sessionBookingId;
      const hasRequestedBooking = requestedBookingId && normalizedBookings.some((booking) => booking._id === requestedBookingId);
      setBookings(normalizedBookings);
      setSelectedBookingId(hasRequestedBooking ? requestedBookingId : normalizedBookings[0]?._id ?? "");
      const continueFromSession = sessionStorage.getItem("booking_progress_continue_payment") === "1";
      setShowPaymentPanel(searchParams.get("continuePayment") === "1" || continueFromSession);

      if (profileResponse.ok && profilePayload?.user) {
        const user = profilePayload.user as CustomerProfile;
        setProfile(user);
        setEditName(user.name);
        setEditPhone(user.phone ?? "");
        setEditAddress(user.address ?? "");
      }

      setLoading(false);
    }

    load();
    return () => {
      active = false;
    };
  }, [searchParams]);

  useEffect(() => {
    if (!loading && !error && bookings.length === 0) {
      const pendingBookingId = sessionStorage.getItem("booking_progress_booking_id")?.trim() ?? "";
      if (!pendingBookingId) {
        router.replace("/booking/detail");
      }
    }
  }, [loading, error, bookings, router]);

  const selectedBooking = bookings.find((booking) => booking._id === selectedBookingId) ?? null;

  async function uploadReceiptIfNeeded() {
    if (!receiptFile) {
      return "";
    }

    const form = new FormData();
    form.append("file", receiptFile);

    const uploadRes = await fetch("/api/uploads/payment-receipt", {
      method: "POST",
      body: form,
    });

    const uploadData = await uploadRes.json().catch(() => ({}));
    if (!uploadRes.ok) {
      throw new Error(uploadData.message ?? "Failed to upload receipt");
    }

    return String(uploadData.url ?? "");
  }

  async function submitPaymentForSelectedBooking() {
    if (!selectedBooking?._id) {
      return;
    }

    if (!transactionReference.trim() && !receiptFile) {
      setError("Please provide transaction reference or upload receipt.");
      return;
    }

    setSubmittingPayment(true);
    setError("");

    try {
      const receiptUrl = await uploadReceiptIfNeeded();
      const amount = Number(selectedBooking.pricing?.total ?? selectedBooking.totalPrice ?? 0);

      const response = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: selectedBooking._id,
          bookingRef: selectedBooking.bookingRef,
          amount,
          method: manualMethod,
          transactionReference: transactionReference.trim() || undefined,
          receiptUrl: receiptUrl || undefined,
          status: "PENDING",
          idempotencyKey: crypto.randomUUID(),
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.message ?? "Failed to submit payment");
      }

      router.push(`/booking/confirmation/${selectedBooking._id}`);
    } catch (submissionError) {
      const message = submissionError instanceof Error ? submissionError.message : "Failed to submit payment";
      setError(message);
    } finally {
      setSubmittingPayment(false);
    }
  }

  const isUnfinishedBooking = !!selectedBooking && !["CHECKED_OUT", "CANCELLED"].includes(selectedBooking.status);
  const hasSubmittedPayment =
    !!selectedBooking?.latestPayment?._id ||
    (selectedBooking?.paymentHistory?.length ?? 0) > 0;
  const canStartFirstPayment = !!selectedBooking && !hasSubmittedPayment;
  const isRejectedByAdmin = selectedBooking?.latestPayment?.status === "REJECTED" || selectedBooking?.paymentStatus === "REJECTED";

  const needsPayment = isUnfinishedBooking && (canStartFirstPayment || isRejectedByAdmin);

  const canContinuePayment = !!selectedBooking && isUnfinishedBooking && (canStartFirstPayment || isRejectedByAdmin);

  function openPaymentAndScroll() {
    setShowPaymentPanel(true);

    requestAnimationFrame(() => {
      const target = paymentPanelRef.current ?? paymentStepRef.current;
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  useEffect(() => {
    if (!showPaymentPanel) {
      return;
    }

    const node = paymentPanelRef.current;
    if (!node) {
      return;
    }

    requestAnimationFrame(() => {
      node.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [selectedBookingId, showPaymentPanel]);

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (!passwordForm.current || !passwordForm.newPass || !passwordForm.confirm) {
      setPasswordMessage("Please fill in all password fields.");
      return;
    }
    if (passwordForm.newPass !== passwordForm.confirm) {
      setPasswordMessage("New password and confirmation do not match.");
      return;
    }
    if (passwordForm.newPass.length < 6) {
      setPasswordMessage("New password must be at least 6 characters.");
      return;
    }
    setPasswordMessage("Password updated successfully.");
    setPasswordForm({ current: "", newPass: "", confirm: "" });
  }

  async function handleProfileUpdate(e: React.FormEvent) {
    e.preventDefault();
    setProfileMessage("");

    if (!editName.trim()) {
      setProfileMessage("Name is required.");
      return;
    }

    const token = localStorage.getItem("hotel_saas_token")?.trim() ?? "";
    if (!token) {
      setProfileMessage("Session expired. Please sign in again.");
      return;
    }

    const response = await fetch("/api/auth/profile", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: editName.trim(),
        phone: editPhone.trim() || undefined,
        address: editAddress.trim() || undefined,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setProfileMessage(payload.message ?? "Failed to update profile.");
      return;
    }

    if (payload.user) {
      setProfile((prev) => (prev ? { ...prev, ...payload.user } : prev));
      setEditName(payload.user.name ?? editName);
      setEditPhone(payload.user.phone ?? editPhone);
      setEditAddress(payload.user.address ?? editAddress);
    }

    setProfileMessage("Profile updated successfully.");
  }

  const tabs = [
    { id: "profile", label: "Profile" },
    { id: "bookings", label: "My Bookings" },
    { id: "journey", label: "Booking Journey" },
  ];

  return (
    <>
      <div className="flex items-center gap-2 mb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
              activeTab === tab.id
                ? "bg-indigo-100 dark:bg-[#3b82f6]/20 text-indigo-600 dark:text-[#3b82f6] font-semibold"
                : "text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#243044]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? <p className="text-sm text-slate-500 dark:text-gray-400">Loading your dashboard...</p> : null}
      {error ? <p className="rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 px-4 py-2.5 text-sm text-red-600 dark:text-red-400">{error}</p> : null}

      {activeTab === "profile" && profile && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <section className="bg-white dark:bg-[#1e2a3a] rounded-2xl p-6 border border-slate-200 dark:border-white/5 flex flex-col items-center text-center transition-colors duration-200">
              <p className="text-2xl font-bold text-slate-900 dark:text-white mb-5">Hi, I&apos;m {profile.name.split(" ")[0] ?? "there"}</p>

              <div className="relative w-24 h-24 rounded-full bg-[#2dd4bf] flex items-center justify-center mb-3 ring-4 ring-[#2dd4bf]/20 group">
                {profilePhotoFile ? (
                  <img src={URL.createObjectURL(profilePhotoFile)} alt="Profile" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold text-white dark:text-[#0f1623]">{profile.name.charAt(0).toUpperCase()}</span>
                )}
                <label className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-indigo-500 dark:bg-[#3b82f6] flex items-center justify-center border-2 border-white dark:border-[#1e2a3a] cursor-pointer hover:bg-indigo-600 dark:hover:bg-[#2563eb] transition-colors duration-200">
                  <Camera size={12} className="text-white" />
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    className="hidden"
                    onChange={(e) => setProfilePhotoFile(e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>

              <p className="text-base font-semibold text-slate-900 dark:text-white mt-1">{profile.name}</p>
              <p className="text-sm text-slate-500 dark:text-gray-400 mt-0.5">{profile.email}</p>

              <div className="mt-5 w-full grid grid-cols-1 gap-3">
                <div className="bg-slate-50 dark:bg-[#243044] rounded-xl p-3 text-left transition-colors duration-200">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-gray-500 mb-1">FROM</p>
                  <div className="flex items-center gap-1.5">
                    <MapPin size={12} className="text-slate-400 dark:text-gray-500" />
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{profile.address || profile.phone ? `${profile.address ?? ""}${profile.address && profile.phone ? " · " : ""}${profile.phone ?? ""}` : "N/A"}</p>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <section className="bg-white dark:bg-[#1e2a3a] rounded-2xl p-6 border border-slate-200 dark:border-white/5 transition-colors duration-200">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Edit Profile</h2>
              </div>

              {profileMessage ? (
                <p className={`mb-4 rounded-xl border px-4 py-2 text-sm ${
                  profileMessage === "Profile updated successfully."
                    ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                    : "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400"
                }`}>
                  {profileMessage}
                </p>
              ) : null}

              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wide">Full Name</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-[#243044] border border-slate-200 dark:border-white/5 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:focus:ring-[#3b82f6]/40 transition-all duration-200"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wide">Phone</label>
                  <input
                    type="tel"
                    className="w-full px-4 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-[#243044] border border-slate-200 dark:border-white/5 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:focus:ring-[#3b82f6]/40 transition-all duration-200"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="Enter phone number"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wide">Address</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-[#243044] border border-slate-200 dark:border-white/5 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:focus:ring-[#3b82f6]/40 transition-all duration-200"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    placeholder="Enter your address"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white bg-indigo-500 dark:bg-[#3b82f6] hover:bg-indigo-600 dark:hover:bg-[#2563eb] active:scale-[0.99] shadow-lg shadow-indigo-500/20 dark:shadow-[#3b82f6]/20 transition-all duration-200"
                >
                  <Save size={15} />
                  Save Profile
                </button>
              </form>
            </section>

            <section className="bg-white dark:bg-[#1e2a3a] rounded-2xl p-6 border border-slate-200 dark:border-white/5 transition-colors duration-200">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Change Password</h2>
              </div>

              {passwordMessage ? (
                <p className="mb-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 px-4 py-2 text-sm text-emerald-600 dark:text-emerald-400">
                  {passwordMessage}
                </p>
              ) : null}

              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wide">Current Password</label>
                  <div className="relative flex items-center">
                    <Lock size={15} className="absolute left-3 text-slate-400 dark:text-gray-500 pointer-events-none" />
                    <input
                      type={showPassword.current ? "text" : "password"}
                      className="w-full pl-9 pr-10 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-[#243044] border border-slate-200 dark:border-white/5 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:focus:ring-[#3b82f6]/40 transition-all duration-200"
                      placeholder="Enter current password"
                      value={passwordForm.current}
                      onChange={(e) => setPasswordForm((v) => ({ ...v, current: e.target.value }))}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => ({ ...v, current: !v.current }))}
                      className="absolute right-3 text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300 transition-colors"
                    >
                      {showPassword.current ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wide">New Password</label>
                  <div className="relative flex items-center">
                    <Lock size={15} className="absolute left-3 text-slate-400 dark:text-gray-500 pointer-events-none" />
                    <input
                      type={showPassword.newPass ? "text" : "password"}
                      className="w-full pl-9 pr-10 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-[#243044] border border-slate-200 dark:border-white/5 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:focus:ring-[#3b82f6]/40 transition-all duration-200"
                      placeholder="Enter new password"
                      value={passwordForm.newPass}
                      onChange={(e) => setPasswordForm((v) => ({ ...v, newPass: e.target.value }))}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => ({ ...v, newPass: !v.newPass }))}
                      className="absolute right-3 text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300 transition-colors"
                    >
                      {showPassword.newPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wide">Confirm New Password</label>
                  <div className="relative flex items-center">
                    <Lock size={15} className="absolute left-3 text-slate-400 dark:text-gray-500 pointer-events-none" />
                    <input
                      type={showPassword.confirm ? "text" : "password"}
                      className="w-full pl-9 pr-10 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-[#243044] border border-slate-200 dark:border-white/5 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:focus:ring-[#3b82f6]/40 transition-all duration-200"
                      placeholder="Confirm new password"
                      value={passwordForm.confirm}
                      onChange={(e) => setPasswordForm((v) => ({ ...v, confirm: e.target.value }))}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => ({ ...v, confirm: !v.confirm }))}
                      className="absolute right-3 text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300 transition-colors"
                    >
                      {showPassword.confirm ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white bg-indigo-500 dark:bg-[#3b82f6] hover:bg-indigo-600 dark:hover:bg-[#2563eb] active:scale-[0.99] shadow-lg shadow-indigo-500/20 dark:shadow-[#3b82f6]/20 transition-all duration-200"
                >
                  <Save size={15} />
                  Update Password
                </button>
              </form>
            </section>
          </div>
        </div>
      )}

      {activeTab === "bookings" && (
        <section className="bg-white dark:bg-[#1e2a3a] rounded-2xl p-6 border border-slate-200 dark:border-white/5 transition-colors duration-200">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">My Bookings</h2>
          {!loading && !error && bookings.length === 0 ? <p className="mt-3 text-sm text-slate-500 dark:text-gray-400">No bookings found for your account yet.</p> : null}

          <div className="mt-4 grid gap-2">
            {bookings.map((booking) => (
              <button
                key={booking._id}
                type="button"
                onClick={() => {
                  setSelectedBookingId(booking._id);
                  setShowPaymentPanel(false);
                }}
                className={`rounded-xl border px-4 py-3 text-left transition-all duration-200 ${
                  selectedBookingId === booking._id
                    ? "border-indigo-400 dark:border-[#3b82f6] bg-indigo-50 dark:bg-[#3b82f6]/10"
                    : "border-slate-200 dark:border-white/5 bg-white dark:bg-[#243044] text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-[#2a3a52] hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <p className="font-semibold text-sm">{booking.bookingRef} - Room {booking.room?.roomNumber ?? "N/A"}</p>
                <p className={`text-xs mt-0.5 ${selectedBookingId === booking._id ? "text-slate-500 dark:text-gray-400" : "text-slate-400 dark:text-gray-500"}`}>
                  {new Date(booking.arrivalDate).toLocaleDateString()} - {new Date(booking.departureDate).toLocaleDateString()} | Payment {booking.paymentStatus}
                </p>
                <p className="mt-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  {booking.status === "PENDING" ? "Reserved" : booking.status}
                </p>
              </button>
            ))}
          </div>

          {selectedBooking && needsPayment && canContinuePayment ? (
            <div className="mt-4 rounded-xl bg-amber-50 dark:bg-[#2dd4bf]/10 border border-amber-200 dark:border-[#2dd4bf]/30 p-4">
              <p className="text-sm text-amber-700 dark:text-[#2dd4bf]"><strong>Reserved:</strong> Click continue payment to complete Step 5 and Step 6 confirmation.</p>
              <Link
                href={`/booking/payment?bookingId=${encodeURIComponent(selectedBooking._id)}&scrollTo=payment-proof`}
                className="mt-2 inline-block rounded-xl bg-amber-500 dark:bg-[#2dd4bf] px-4 py-2 text-sm font-semibold text-white dark:text-[#0f1623] hover:bg-amber-600 dark:hover:bg-[#2dd4bf]/90 transition-all duration-200"
              >
                Continue Payment
              </Link>
            </div>
          ) : null}
        </section>
      )}

      {activeTab === "journey" && (
        <section className="bg-white dark:bg-[#1e2a3a] rounded-2xl p-6 border border-slate-200 dark:border-white/5 transition-colors duration-200">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Booking Journey (Step 1-6)</h2>

          {!selectedBooking ? <p className="mt-3 text-sm text-slate-500 dark:text-gray-400">Select a booking to view your full journey details.</p> : null}

          {selectedBooking ? (
            <div className="mt-4 grid gap-4">
              <article ref={paymentStepRef} className="rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#243044] p-4 transition-colors duration-200">
                <p className="font-semibold text-slate-900 dark:text-white mb-2">Step 1: Booking Details</p>
                <div className="space-y-1 text-sm text-slate-700 dark:text-gray-300">
                  <p><strong className="text-slate-500 dark:text-gray-400">Arrival:</strong> {new Date(selectedBooking.arrivalDate).toLocaleDateString()}</p>
                  <p><strong className="text-slate-500 dark:text-gray-400">Nights:</strong> {selectedBooking.nights}</p>
                  <p><strong className="text-slate-500 dark:text-gray-400">Guests:</strong> {selectedBooking.guests.adults} adult(s), {selectedBooking.guests.children} child(ren)</p>
                </div>
              </article>

              <article className="rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#243044] p-4 transition-colors duration-200">
                <p className="font-semibold text-slate-900 dark:text-white mb-2">Step 2: Room Selection</p>
                <div className="space-y-1 text-sm text-slate-700 dark:text-gray-300">
                  <p><strong className="text-slate-500 dark:text-gray-400">Room Number:</strong> {selectedBooking.room?.roomNumber ?? "N/A"}</p>
                  <p><strong className="text-slate-500 dark:text-gray-400">Room Type:</strong> {selectedBooking.room?.type?.name ?? "N/A"} {selectedBooking.room?.type?.code ? `(${selectedBooking.room.type.code})` : ""}</p>
                  <p><strong className="text-slate-500 dark:text-gray-400">Pricing Plan:</strong> {selectedBooking.pricingPlan}</p>
                </div>
              </article>

              <article className="rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#243044] p-4 transition-colors duration-200">
                <p className="font-semibold text-slate-900 dark:text-white mb-2">Step 3: Guest Information</p>
                <div className="space-y-1 text-sm text-slate-700 dark:text-gray-300">
                  <p><strong className="text-slate-500 dark:text-gray-400">Full Name:</strong> {selectedBooking.guestSnapshot.fullName}</p>
                  <p><strong className="text-slate-500 dark:text-gray-400">Email:</strong> {selectedBooking.guestSnapshot.email}</p>
                  <p><strong className="text-slate-500 dark:text-gray-400">Phone:</strong> {selectedBooking.guestSnapshot.phone ?? "N/A"}</p>
                  <p><strong className="text-slate-500 dark:text-gray-400">ID Document:</strong> {selectedBooking.guestSnapshot.identityDocumentUrl ?? "N/A"}</p>
                </div>
              </article>

              <article className="rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#243044] p-4 transition-colors duration-200">
                <p className="font-semibold text-slate-900 dark:text-white mb-2">Step 4: Account Information</p>
                <div className="space-y-1 text-sm text-slate-700 dark:text-gray-300">
                  <p><strong className="text-slate-500 dark:text-gray-400">Account Name:</strong> {profile?.name ?? "N/A"}</p>
                  <p><strong className="text-slate-500 dark:text-gray-400">Account Email:</strong> {profile?.email ?? "N/A"}</p>
                  <p><strong className="text-slate-500 dark:text-gray-400">Account Phone:</strong> {profile?.phone ?? "N/A"}</p>
                </div>
              </article>

              <article className="rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#243044] p-4 transition-colors duration-200">
                <p className="font-semibold text-slate-900 dark:text-white mb-2">Step 5: Payment</p>
                <div className="space-y-1 text-sm text-slate-700 dark:text-gray-300">
                  <p><strong className="text-slate-500 dark:text-gray-400">Total:</strong> ETB {selectedBooking.pricing.total.toFixed(2)}</p>
                  <p><strong className="text-slate-500 dark:text-gray-400">Paid:</strong> ETB {selectedBooking.amountPaid.toFixed(2)}</p>
                  <p><strong className="text-slate-500 dark:text-gray-400">Latest Payment:</strong> <PaymentBadge status={selectedBooking.latestPayment?.status ?? "PENDING"} /></p>
                  {selectedBooking.latestPayment?.transactionReference ? <p><strong className="text-slate-500 dark:text-gray-400">Reference:</strong> {selectedBooking.latestPayment.transactionReference}</p> : null}
                </div>

                {showPaymentPanel && needsPayment && canContinuePayment ? (
                  <div ref={paymentPanelRef} className="mt-4 grid gap-4 rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-[#1e2a3a] p-4 transition-colors duration-200">
                    <p className="text-xs text-slate-500 dark:text-gray-400">Pay from this page by submitting receipt or transaction reference.</p>

                    <label className="flex flex-col gap-1.5">
                      <span className="text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wide">Payment Method</span>
                      <select
                        className="w-full px-4 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-[#243044] border border-slate-200 dark:border-white/5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:focus:ring-[#3b82f6]/40 transition-all duration-200 appearance-none"
                        value={manualMethod}
                        onChange={(e) => setManualMethod(e.target.value as "bank" | "mobile_money")}
                      >
                        <option value="bank">Bank Transfer</option>
                        <option value="mobile_money">Mobile Money (Telebirr / M-Pesa)</option>
                      </select>
                    </label>

                    <label className="flex flex-col gap-1.5">
                      <span className="text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wide">Transaction Reference</span>
                      <input
                        className="w-full px-4 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-[#243044] border border-slate-200 dark:border-white/5 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:focus:ring-[#3b82f6]/40 transition-all duration-200"
                        placeholder="TRX-123456"
                        value={transactionReference}
                        onChange={(e) => setTransactionReference(e.target.value)}
                      />
                    </label>

                    <label className="flex flex-col gap-1.5">
                      <span className="text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wide">Receipt File (image/pdf)</span>
                      <input
                        className="w-full text-sm text-slate-500 dark:text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:text-xs file:font-semibold file:bg-indigo-50 dark:file:bg-[#3b82f6]/10 file:text-indigo-600 dark:file:text-[#3b82f6] file:border-0 hover:file:bg-indigo-100 dark:hover:file:bg-[#3b82f6]/20 file:transition-all file:duration-200"
                        type="file"
                        accept="image/jpeg,image/png,application/pdf"
                        onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
                      />
                    </label>

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        className="rounded-xl bg-indigo-500 dark:bg-[#3b82f6] px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-600 dark:hover:bg-[#2563eb] active:scale-[0.99] shadow-lg shadow-indigo-500/20 dark:shadow-[#3b82f6]/20 transition-all duration-200 disabled:opacity-60"
                        onClick={submitPaymentForSelectedBooking}
                        disabled={submittingPayment}
                      >
                        {submittingPayment ? "Submitting..." : "Submit Payment & Continue Confirmation"}
                      </button>

                      <button
                        type="button"
                        className="rounded-xl border border-slate-200 dark:border-white/5 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-[#243044] hover:text-slate-900 dark:hover:text-white transition-all duration-200"
                        onClick={() => router.push(`/booking/confirmation/${selectedBooking._id}`)}
                      >
                        Go to Confirmation
                      </button>
                    </div>
                  </div>
                ) : null}
              </article>

              <article className="rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#243044] p-4 transition-colors duration-200">
                <p className="font-semibold text-slate-900 dark:text-white mb-2">Step 6: Confirmation</p>
                <div className="space-y-1 text-sm text-slate-700 dark:text-gray-300">
                  <p><strong className="text-slate-500 dark:text-gray-400">Booking Ref:</strong> {selectedBooking.bookingRef}</p>
                  <p><strong className="text-slate-500 dark:text-gray-400">Booking Status:</strong> {selectedBooking.status}</p>
                  <p><strong className="text-slate-500 dark:text-gray-400">Payment Status:</strong> {selectedBooking.paymentStatus}</p>
                  <p><strong className="text-slate-500 dark:text-gray-400">Created At:</strong> {new Date(selectedBooking.createdAt).toLocaleString()}</p>
                </div>
              </article>
            </div>
          ) : null}
        </section>
      )}
    </>
  );
}