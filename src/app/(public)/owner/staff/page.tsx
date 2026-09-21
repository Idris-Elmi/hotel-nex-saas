"use client";

import { useEffect, useState } from "react";
import { RoleGate } from "@/components/auth/RoleGate";

type StaffMember = {
  _id: string;
  name: string;
  email: string;
  role: "ADMIN" | "RECEPTIONIST";
  phone?: string;
  isActive: boolean;
  createdAt: string;
};

function formatDate(raw: string) {
  return new Date(raw).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default function OwnerStaffPage() {
  return (
    <RoleGate allow={["OWNER"]} loginRoute="/auth/staff-signin">
      <OwnerStaffContent />
    </RoleGate>
  );
}

function OwnerStaffContent() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [filter, setFilter] = useState<"ALL" | "ADMIN" | "RECEPTIONIST">("ALL");
  const [editTarget, setEditTarget] = useState<StaffMember | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [addForm, setAddForm] = useState({ name: "", email: "", phone: "", role: "ADMIN" as StaffMember["role"], password: "" });
  const [editForm, setEditForm] = useState({ name: "", phone: "", role: "ADMIN" as StaffMember["role"], isActive: true });

  function getToken() {
    if (typeof window === "undefined") return "";
    return (sessionStorage.getItem("hotel_saas_token_staff") || "") ?? "";
  }

  function requireAuthHeader() {
    const token = getToken().trim();
    if (!token) return null;
    return { Authorization: `Bearer ${token}` };
  }

  async function fetchStaff() {
    const authHeader = requireAuthHeader();
    if (!authHeader) return;
    setLoading(true);
    setError("");
    const res = await fetch("/api/owner/staff", { headers: authHeader, cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.message ?? "Failed to load staff");
      return;
    }
    setStaff(data.staff ?? []);
  }

  async function createStaff(e: React.FormEvent) {
    e.preventDefault();
    const authHeader = requireAuthHeader();
    if (!authHeader) return;
    setSaving(true);
    setError("");
    const res = await fetch("/api/owner/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeader },
      body: JSON.stringify(addForm),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.message ?? "Failed to create staff");
      return;
    }
    setAddForm({ name: "", email: "", phone: "", role: "ADMIN", password: "" });
    setShowAddForm(false);
    setSuccess("Staff member created successfully");
    await fetchStaff();
  }

  async function updateStaff(id: string) {
    const authHeader = requireAuthHeader();
    if (!authHeader) return;
    setSaving(true);
    setError("");
    const res = await fetch(`/api/owner/staff/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeader },
      body: JSON.stringify({
        name: editForm.name,
        phone: editForm.phone,
        role: editForm.role,
        isActive: editForm.isActive,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.message ?? "Failed to update staff");
      return;
    }
    setEditTarget(null);
    setSuccess("Staff member updated successfully");
    await fetchStaff();
  }

  async function toggleActive(member: StaffMember) {
    const authHeader = requireAuthHeader();
    if (!authHeader) return;
    setError("");
    const res = await fetch(`/api/owner/staff/${member._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeader },
      body: JSON.stringify({ isActive: !member.isActive }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.message ?? "Failed to update status");
      return;
    }
    await fetchStaff();
  }

  async function deleteStaff(id: string) {
    const authHeader = requireAuthHeader();
    if (!authHeader) return;
    setSaving(true);
    setError("");
    const res = await fetch(`/api/owner/staff/${id}`, {
      method: "DELETE",
      headers: authHeader,
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.message ?? "Failed to delete staff");
      return;
    }
    setDeleteConfirm(null);
    setSuccess("Staff member permanently deleted");
    await fetchStaff();
  }

  function openEdit(member: StaffMember) {
    setEditTarget(member);
    setEditForm({ name: member.name, phone: member.phone ?? "", role: member.role, isActive: member.isActive });
    setShowAddForm(false);
  }

  useEffect(() => { void fetchStaff(); }, []);

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(""), 3000);
    return () => clearTimeout(t);
  }, [success]);

  const activeStaff = staff.filter((s) => s.isActive);
  const filtered = filter === "ALL" ? staff : staff.filter((s) => s.role === filter);
  const adminCount = activeStaff.filter((s) => s.role === "ADMIN").length;
  const receptionistCount = activeStaff.filter((s) => s.role === "RECEPTIONIST").length;

  return (
    <main className="p-6 lg:p-8 space-y-8 bg-[#F0F4FF] dark:bg-[#070B1A] min-h-screen">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-serif font-bold text-slate-900 dark:text-slate-100">Staff Management</h1>
        <button
          className="rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-sm font-semibold text-white transition-all duration-200"
          onClick={() => { setShowAddForm((v) => !v); setEditTarget(null); }}
        >
          {showAddForm ? "Cancel" : "Add Staff"}
        </button>
      </div>

      {success ? (
        <p className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">{success}</p>
      ) : null}
      {error ? (
        <p className="rounded-xl bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-red-700 dark:text-red-400">{error}</p>
      ) : null}

      {/* Add Staff Form */}
      {showAddForm ? (
        <section className="bg-white dark:bg-[#0F1629] border border-slate-200 dark:border-[#1E2D4A] rounded-2xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4">New Staff Member</h2>
          <form onSubmit={createStaff} className="grid gap-3 md:grid-cols-2">
            <input
              className="rounded-xl border border-[#E0E7FF] dark:border-[#1E2D4A] bg-[#F1F5FF] dark:bg-[#1A2540] px-3 py-2 text-sm text-[#0D1340] dark:text-[#EEF2FF] placeholder:text-[#8892B8]"
              placeholder="Full name" value={addForm.name}
              onChange={(e) => setAddForm((v) => ({ ...v, name: e.target.value }))} required
            />
            <input
              className="rounded-xl border border-[#E0E7FF] dark:border-[#1E2D4A] bg-[#F1F5FF] dark:bg-[#1A2540] px-3 py-2 text-sm text-[#0D1340] dark:text-[#EEF2FF] placeholder:text-[#8892B8]"
              type="email" placeholder="Email" value={addForm.email}
              onChange={(e) => setAddForm((v) => ({ ...v, email: e.target.value }))} required
            />
            <input
              className="rounded-xl border border-[#E0E7FF] dark:border-[#1E2D4A] bg-[#F1F5FF] dark:bg-[#1A2540] px-3 py-2 text-sm text-[#0D1340] dark:text-[#EEF2FF] placeholder:text-[#8892B8]"
              placeholder="Phone" value={addForm.phone}
              onChange={(e) => setAddForm((v) => ({ ...v, phone: e.target.value }))}
            />
            <select
              className="rounded-xl border border-[#E0E7FF] dark:border-[#1E2D4A] bg-[#F1F5FF] dark:bg-[#1A2540] px-3 py-2 text-sm text-[#0D1340] dark:text-[#EEF2FF]"
              value={addForm.role}
              onChange={(e) => setAddForm((v) => ({ ...v, role: e.target.value as StaffMember["role"] }))}
            >
              <option value="ADMIN">Admin</option>
              <option value="RECEPTIONIST">Receptionist</option>
            </select>
            <input
              className="rounded-xl border border-[#E0E7FF] dark:border-[#1E2D4A] bg-[#F1F5FF] dark:bg-[#1A2540] px-3 py-2 text-sm text-[#0D1340] dark:text-[#EEF2FF] placeholder:text-[#8892B8]"
              type="password" placeholder="Temporary password" value={addForm.password}
              onChange={(e) => setAddForm((v) => ({ ...v, password: e.target.value }))} required minLength={6}
            />
            <button
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 transition-all duration-200 md:col-span-2"
              type="submit" disabled={saving}
            >
              {saving ? "Creating..." : "Create Staff Account"}
            </button>
          </form>
        </section>
      ) : null}

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {(["ALL", "ADMIN", "RECEPTIONIST"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
              filter === tab
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-white dark:bg-[#0F1629] border border-slate-200 dark:border-[#1E2D4A] text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#141E35]"
            }`}
          >
            {tab === "ALL" ? `All (${staff.length})` : tab === "ADMIN" ? `Admins (${adminCount})` : `Receptionists (${receptionistCount})`}
          </button>
        ))}
      </div>

      {loading ? <p className="text-sm text-slate-500 dark:text-slate-400">Loading staff...</p> : null}

      {/* Staff Cards */}
      <div className="grid gap-3">
        {filtered.map((member) => (
          <article
            key={member._id}
            className="bg-white dark:bg-[#0F1629] border border-slate-200 dark:border-[#1E2D4A] rounded-2xl p-5 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{member.name}</p>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    member.role === "ADMIN"
                      ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
                      : "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300"
                  }`}>
                    {member.role}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    member.isActive
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                      : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                  }`}>
                    {member.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{member.email}</p>
                <p className="text-sm text-slate-500 dark:text-slate-500">
                  {member.phone ?? "No phone"} &middot; Member since {formatDate(member.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleActive(member)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                    member.isActive ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"
                  }`}
                  title={member.isActive ? "Deactivate" : "Activate"}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                    member.isActive ? "translate-x-6" : "translate-x-1"
                  }`} />
                </button>
                <button
                  className="rounded-xl border border-[#E0E7FF] dark:border-[#1E2D4A] px-3 py-2 text-xs font-semibold text-[#4B5580] dark:text-[#8892C8] hover:bg-[#F8FAFF] dark:hover:bg-[#141E35] transition-all duration-200"
                  onClick={() => openEdit(member)}
                >
                  Edit
                </button>
                <button
                  className="rounded-xl bg-rose-100 dark:bg-rose-900/30 px-3 py-2 text-xs font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-200 dark:hover:bg-rose-900/50 transition-all duration-200"
                  onClick={() => setDeleteConfirm(member._id)}
                >
                  Delete
                </button>
              </div>
            </div>

            {/* Delete Confirmation */}
            {deleteConfirm === member._id ? (
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-[#1E2D4A]">
                <p className="text-sm text-rose-700 dark:text-rose-400 mb-3">
                  Permanently delete <strong>{member.name}</strong>? This cannot be undone.
                </p>
                <div className="flex gap-2">
                  <button
                    className="rounded-xl bg-rose-600 hover:bg-rose-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 transition-all duration-200"
                    onClick={() => deleteStaff(member._id)} disabled={saving}
                  >
                    {saving ? "Deleting..." : "Delete Permanently"}
                  </button>
                  <button
                    className="rounded-xl border border-[#E0E7FF] dark:border-[#1E2D4A] px-4 py-2 text-sm font-semibold text-[#4B5580] dark:text-[#8892C8] hover:bg-[#F8FAFF] dark:hover:bg-[#141E35] transition-all duration-200"
                    onClick={() => setDeleteConfirm(null)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}

            {/* Edit Panel */}
            {editTarget?._id === member._id ? (
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-[#1E2D4A]">
                <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">Edit Staff Member</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  <input
                    className="rounded-xl border border-[#E0E7FF] dark:border-[#1E2D4A] bg-[#F1F5FF] dark:bg-[#1A2540] px-3 py-2 text-sm text-[#0D1340] dark:text-[#EEF2FF] placeholder:text-[#8892B8]"
                    placeholder="Full name" value={editForm.name}
                    onChange={(e) => setEditForm((v) => ({ ...v, name: e.target.value }))} required
                  />
                  <input
                    className="rounded-xl border border-[#E0E7FF] dark:border-[#1E2D4A] bg-[#F1F5FF] dark:bg-[#1A2540] px-3 py-2 text-sm text-[#0D1340] dark:text-[#EEF2FF] placeholder:text-[#8892B8]"
                    placeholder="Phone" value={editForm.phone}
                    onChange={(e) => setEditForm((v) => ({ ...v, phone: e.target.value }))}
                  />
                  <select
                    className="rounded-xl border border-[#E0E7FF] dark:border-[#1E2D4A] bg-[#F1F5FF] dark:bg-[#1A2540] px-3 py-2 text-sm text-[#0D1340] dark:text-[#EEF2FF]"
                    value={editForm.role}
                    onChange={(e) => setEditForm((v) => ({ ...v, role: e.target.value as StaffMember["role"] }))}
                  >
                    <option value="ADMIN">Admin</option>
                    <option value="RECEPTIONIST">Receptionist</option>
                  </select>
                  <label className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                    <button
                      type="button"
                      onClick={() => setEditForm((v) => ({ ...v, isActive: !v.isActive }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                        editForm.isActive ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                        editForm.isActive ? "translate-x-6" : "translate-x-1"
                      }`} />
                    </button>
                    {editForm.isActive ? "Active" : "Inactive"}
                  </label>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    className="rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 transition-all duration-200"
                    onClick={() => updateStaff(member._id)} disabled={saving}
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    className="rounded-xl border border-[#E0E7FF] dark:border-[#1E2D4A] px-4 py-2 text-sm font-semibold text-[#4B5580] dark:text-[#8892C8] hover:bg-[#F8FAFF] dark:hover:bg-[#141E35] transition-all duration-200"
                    onClick={() => setEditTarget(null)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}
          </article>
        ))}
        {!loading && filtered.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">No staff members found.</p>
        ) : null}
      </div>
    </main>
  );
}
