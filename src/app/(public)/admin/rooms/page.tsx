"use client";

import { useEffect, useRef, useState } from "react";
import { RoleGate } from "@/components/auth/RoleGate";
import { triggerAnalyticsRefresh } from "@/lib/analyticsRefresh";

type RoomType = {
  _id: string;
  name: string;
  code: string;
  breakfastAddonPrice: number;
  isActive: boolean;
};

type Room = {
  _id: string;
  roomNumber: string;
  type: RoomType;
  pricePerNight: number;
  capacity: number;
  images: string[];
  status: "AVAILABLE" | "RESERVED" | "OCCUPIED" | "MAINTENANCE";
  isActive: boolean;
};

const statuses = ["AVAILABLE", "RESERVED", "OCCUPIED", "MAINTENANCE"] as const;

export default function AdminRoomsPage({ apiBase }: { apiBase?: string } = {}) {
  return (
    <RoleGate allow={["OWNER", "ADMIN"]} loginRoute="/auth/staff-signin">
      <AdminRoomsContent apiBase={apiBase} />
    </RoleGate>
  );
}

function AdminRoomsContent({ apiBase = "/api/admin" }: { apiBase?: string }) {
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ type: "success" | "warning"; message: string } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(type: "success" | "warning", message: string) {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }

    setToast({ type, message });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 3000);
  }

  function getToken() {
    if (typeof window === "undefined") {
      return "";
    }
    return (sessionStorage.getItem("hotel_saas_token_staff") || "") ?? "";
  }

  function requireAuthHeader(): Record<string, string> {
    const stored = getToken().trim();
    if (!stored) {
      // Allow cookie-based auth fallback when localStorage token is unavailable.
      return {};
    }

    const token = stored.startsWith("Bearer ") ? stored.slice(7).trim() : stored;
    if (!token) {
      return {};
    }

    return {
      Authorization: `Bearer ${token}`,
      "x-access-token": token,
    };
  }

  const [newType, setNewType] = useState({ name: "", code: "", breakfastAddonPrice: 0 });
  const [newRoom, setNewRoom] = useState({
    roomNumber: "",
    type: "",
    pricePerNight: 0,
    capacity: 2,
    status: "AVAILABLE",
  });
  const [newRoomImageFiles, setNewRoomImageFiles] = useState<File[]>([]);
  const [replacementImageFiles, setReplacementImageFiles] = useState<Record<string, File[]>>({});
  const [replacingImagesForRoomId, setReplacingImagesForRoomId] = useState("");

  async function uploadRoomImages(files: File[]) {
    if (files.length === 0) {
      return [] as string[];
    }

    const urls: string[] = [];
    for (const file of files) {
      const form = new FormData();
      form.append("file", file);

      const uploadRes = await fetch("/api/uploads/room-image", {
        method: "POST",
        body: form,
      });

      const uploadPayload = await uploadRes.json().catch(() => ({}));
      if (!uploadRes.ok) {
        throw new Error(uploadPayload.message ?? "Failed to upload room image");
      }

      const uploadedUrl = String(uploadPayload.url ?? "").trim();
      if (uploadedUrl) {
        urls.push(uploadedUrl);
      }
    }

    return urls;
  }

  async function fetchAll() {
    const authHeader = requireAuthHeader();

    setLoading(true);
    setError("");

    try {
      const headers = authHeader;
      const [typesRes, roomsRes] = await Promise.all([
        fetch(`${apiBase}/room-types`, { headers, cache: "no-store" }),
        fetch(`${apiBase}/rooms`, { headers, cache: "no-store" }),
      ]);

      const typesData = await typesRes.json().catch(() => ({}));
      const roomsData = await roomsRes.json().catch(() => ({}));

      if (!typesRes.ok || !roomsRes.ok) {
        if (typesRes.status === 401 || roomsRes.status === 401) {
          setError("Your admin session expired. Please login again.");
          return false;
        }
        setError(typesData.message ?? roomsData.message ?? "Failed to load room management data");
        return false;
      }

      setRoomTypes(typesData.types ?? []);
      setRooms(roomsData.rooms ?? []);
      return true;
    } finally {
      setLoading(false);
    }
  }

  async function createRoomType(e: React.FormEvent) {
    e.preventDefault();
    const authHeader = requireAuthHeader();

    const res = await fetch(`${apiBase}/room-types`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeader,
      },
      body: JSON.stringify(newType),
    });

    if (!res.ok) {
      const data = await res.json();
      if (res.status === 401) {
        setError("Your admin session expired. Please login again.");
        return;
      }
      setError(data.message ?? "Failed to create room type");
      return;
    }

    setNewType({ name: "", code: "", breakfastAddonPrice: 0 });
    await fetchAll();
  }

  async function createRoom(e: React.FormEvent) {
    e.preventDefault();
    const authHeader = requireAuthHeader();

    let imageUrls: string[] = [];
    try {
      imageUrls = await uploadRoomImages(newRoomImageFiles);
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : "Failed to upload room images";
      setError(message);
      return;
    }

    const res = await fetch(`${apiBase}/rooms`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeader,
      },
      body: JSON.stringify({ ...newRoom, roomNumber: newRoom.roomNumber.trim(), type: newRoom.type, images: imageUrls }),
    });

    if (!res.ok) {
      const data = await res.json();
      if (res.status === 401) {
        setError("Your admin session expired. Please login again.");
        return;
      }
      if (res.status === 409) {
        const existing = data?.details?.existingRoom;
        const hint = existing
          ? ` Existing room -> ID: ${existing.id}, Number: ${existing.roomNumber}, Status: ${existing.status}, Active: ${existing.isActive}`
          : "";
        setError((data.message ?? "Room number already exists") + hint);
        await fetchAll();
        return;
      }
      setError(data.message ?? "Failed to create room");
      return;
    }

    const data = await res.json().catch(() => ({}));
    if (data?.alreadyExists) {
      const existing = data?.room;
      const hint = existing
        ? ` Existing room -> ID: ${existing._id}, Number: ${existing.roomNumber}, Status: ${existing.status}`
        : "";
      const warningMessage = (data?.message ?? "Room number already exists") + hint;
      setError(warningMessage);
      showToast("warning", warningMessage);
      await fetchAll();
      return;
    }

    if (data?.room?._id) {
      setRooms((previous) => {
        const withoutDuplicate = previous.filter((room) => room._id !== data.room._id);
        return [data.room as Room, ...withoutDuplicate];
      });
    }

    setNewRoom({ roomNumber: "", type: "", pricePerNight: 0, capacity: 2, status: "AVAILABLE" });
    setNewRoomImageFiles([]);
    showToast("success", "Created successfully");
    await fetchAll();
    triggerAnalyticsRefresh();
  }

  async function replaceRoomImages(roomId: string) {
    const authHeader = requireAuthHeader();
    const files = replacementImageFiles[roomId] ?? [];

    if (files.length === 0) {
      setError("Select one or more images to replace room photos.");
      return;
    }

    setReplacingImagesForRoomId(roomId);
    setError("");

    try {
      const imageUrls = await uploadRoomImages(files);
      const res = await fetch(`${apiBase}/rooms/${roomId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authHeader,
        },
        body: JSON.stringify({ images: imageUrls }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message ?? "Failed to replace room images");
      }

      setReplacementImageFiles((previous) => ({ ...previous, [roomId]: [] }));
      showToast("success", "Room images updated");
      await fetchAll();
    } catch (replaceError) {
      const message = replaceError instanceof Error ? replaceError.message : "Failed to replace room images";
      setError(message);
    } finally {
      setReplacingImagesForRoomId("");
    }
  }

  async function updateRoomStatus(roomId: string, status: Room["status"]) {
    const authHeader = requireAuthHeader();

    const res = await fetch(`${apiBase}/rooms/${roomId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...authHeader,
      },
      body: JSON.stringify({ status }),
    });

    if (!res.ok) {
      const data = await res.json();
      if (res.status === 401) {
        setError("Your admin session expired. Please login again.");
        return;
      }
      setError(data.message ?? "Failed to update room status");
      return;
    }

    await fetchAll();
    triggerAnalyticsRefresh();
  }

  async function deleteRoom(roomId: string) {
    const authHeader = requireAuthHeader();

    const res = await fetch(`${apiBase}/rooms/${roomId}`, {
      method: "DELETE",
      headers: authHeader,
    });

    if (!res.ok) {
      const data = await res.json();
      if (res.status === 401) {
        setError("Your admin session expired. Please login again.");
        return;
      }
      setError(data.message ?? "Failed to delete room");
      return;
    }

    await fetchAll();
    triggerAnalyticsRefresh();
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchAll();
    }, 0);

    const interval = window.setInterval(() => {
      void fetchAll();
    }, 10000);

    return () => {
      window.clearTimeout(timer);
      window.clearInterval(interval);
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
    // Run once after mount to load persisted room data for admin users.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="p-6 lg:p-8 space-y-8 bg-[#F0F4FF] dark:bg-[#070B1A] min-h-screen">
      <h1 className="text-2xl font-serif font-bold text-slate-900 dark:text-slate-100">Room Management</h1>

      {error ? <p className="mb-4 rounded-xl bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-red-700 dark:text-red-400">{error}</p> : null}
      {toast ? (
        <div
          className={`mb-4 rounded-xl px-3 py-2 text-sm ${
            toast.type === "success"
              ? "border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-400"
              : "border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-400"
          }`}
        >
          {toast.message}
        </div>
      ) : null}
      {loading ? <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">Loading...</p> : null}

      <div className="mb-6">
        <button className="rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-sm font-semibold text-white transition-all duration-200" onClick={fetchAll}>
          Refresh Room Data
        </button>
      </div>

      <section className="mb-8 grid gap-6 md:grid-cols-2">
        <form onSubmit={createRoomType} className="grid gap-3 bg-white dark:bg-[#0F1629] border border-slate-200 dark:border-[#1E2D4A] rounded-2xl p-5 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Create Room Type</h2>
          <input className="rounded-xl border border-[#E0E7FF] dark:border-[#1E2D4A] bg-[#F1F5FF] dark:bg-[#1A2540] px-3 py-2 text-sm text-[#0D1340] dark:text-[#EEF2FF] placeholder:text-[#8892B8]" placeholder="Type name" value={newType.name} onChange={(e) => setNewType((v) => ({ ...v, name: e.target.value }))} required />
          <input className="rounded-xl border border-[#E0E7FF] dark:border-[#1E2D4A] bg-[#F1F5FF] dark:bg-[#1A2540] px-3 py-2 text-sm text-[#0D1340] dark:text-[#EEF2FF] placeholder:text-[#8892B8]" placeholder="Code (e.g. DELUXE)" value={newType.code} onChange={(e) => setNewType((v) => ({ ...v, code: e.target.value }))} required />
          <label className="grid gap-1 text-sm font-semibold text-[#4B5580] dark:text-[#8892C8]">
            Breakfast Add-on Price (ETB)
            <input
              className="rounded-xl border border-[#E0E7FF] dark:border-[#1E2D4A] bg-[#F1F5FF] dark:bg-[#1A2540] px-3 py-2 text-sm text-[#0D1340] dark:text-[#EEF2FF] placeholder:text-[#8892B8]"
              type="number"
              min={0}
              step="1"
              placeholder="e.g. 20"
              value={newType.breakfastAddonPrice}
              onChange={(e) => setNewType((v) => ({ ...v, breakfastAddonPrice: Number(e.target.value) }))}
              required
            />
            <span className="text-xs font-normal text-slate-500 dark:text-slate-400">Extra cost added when guest selects bed & breakfast.</span>
          </label>
          <button className="rounded-xl bg-indigo-600 hover:bg-indigo-700 px-3 py-2 text-sm font-semibold text-white transition-all duration-200" type="submit">Create Type</button>
        </form>

        <form onSubmit={createRoom} className="grid gap-3 bg-white dark:bg-[#0F1629] border border-slate-200 dark:border-[#1E2D4A] rounded-2xl p-5 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Create Room</h2>
          <input className="rounded-xl border border-[#E0E7FF] dark:border-[#1E2D4A] bg-[#F1F5FF] dark:bg-[#1A2540] px-3 py-2 text-sm text-[#0D1340] dark:text-[#EEF2FF] placeholder:text-[#8892B8]" placeholder="Room number" value={newRoom.roomNumber} onChange={(e) => setNewRoom((v) => ({ ...v, roomNumber: e.target.value }))} required />
          <select className="rounded-xl border border-[#E0E7FF] dark:border-[#1E2D4A] bg-[#F1F5FF] dark:bg-[#1A2540] px-3 py-2 text-sm text-[#0D1340] dark:text-[#EEF2FF] placeholder:text-[#8892B8]" value={newRoom.type} onChange={(e) => setNewRoom((v) => ({ ...v, type: e.target.value }))} required>
            <option value="">Select room type</option>
            {roomTypes.map((type) => (
              <option key={type._id} value={type._id}>{type.name} ({type.code})</option>
            ))}
          </select>
          <label className="grid gap-1 text-sm font-semibold text-[#4B5580] dark:text-[#8892C8]">
            Price Per Night (ETB)
            <input
              className="rounded-xl border border-[#E0E7FF] dark:border-[#1E2D4A] bg-[#F1F5FF] dark:bg-[#1A2540] px-3 py-2 text-sm text-[#0D1340] dark:text-[#EEF2FF] placeholder:text-[#8892B8]"
              type="number"
              min={0}
              step="1"
              placeholder="e.g. 180"
              value={newRoom.pricePerNight}
              onChange={(e) => setNewRoom((v) => ({ ...v, pricePerNight: Number(e.target.value) }))}
              required
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-[#4B5580] dark:text-[#8892C8]">
            Capacity (Number of Guests)
            <input
              className="rounded-xl border border-[#E0E7FF] dark:border-[#1E2D4A] bg-[#F1F5FF] dark:bg-[#1A2540] px-3 py-2 text-sm text-[#0D1340] dark:text-[#EEF2FF] placeholder:text-[#8892B8]"
              type="number"
              min={1}
              step="1"
              placeholder="e.g. 2"
              value={newRoom.capacity}
              onChange={(e) => setNewRoom((v) => ({ ...v, capacity: Number(e.target.value) }))}
              required
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-[#4B5580] dark:text-[#8892C8]">
            Room Images (multiple)
            <input
              className="rounded-xl border border-[#E0E7FF] dark:border-[#1E2D4A] bg-[#F1F5FF] dark:bg-[#1A2540] px-3 py-2 text-sm text-[#0D1340] dark:text-[#EEF2FF] placeholder:text-[#8892B8]"
              type="file"
              accept="image/jpeg,image/png"
              multiple
              onChange={(e) => setNewRoomImageFiles(Array.from(e.target.files ?? []))}
            />
          </label>
          {newRoomImageFiles.length > 0 ? <p className="text-xs text-slate-500 dark:text-slate-400">{newRoomImageFiles.length} image(s) selected.</p> : null}
          <button className="rounded-xl bg-indigo-600 hover:bg-indigo-700 px-3 py-2 text-sm font-semibold text-white transition-all duration-200" type="submit">Create Room</button>
        </form>
      </section>

      <section className="bg-white dark:bg-[#0F1629] border border-slate-200 dark:border-[#1E2D4A] rounded-2xl p-5 shadow-sm">
        <h2 className="mb-4 text-xl font-bold text-slate-900 dark:text-slate-100">Rooms</h2>
        <div className="grid gap-3">
          {rooms.map((room) => (
            <article key={room._id} className="grid gap-2 md:grid-cols-[1fr_auto_auto] md:items-center bg-white dark:bg-[#0F1629] border border-slate-200 dark:border-[#1E2D4A] rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200">
              <div>
                {room.images?.[0] ? (
                  <img
                    src={room.images[0]}
                    alt={`Room ${room.roomNumber} preview`}
                    className="mb-2 h-28 w-full rounded-lg border border-slate-200 dark:border-[#1E2D4A] object-cover md:max-w-xs"
                  />
                ) : (
                  <div className="mb-2 flex h-28 w-full items-center justify-center rounded-lg border border-dashed border-slate-300 dark:border-[#252D47] bg-slate-50 dark:bg-[#141E35] text-xs text-slate-500 dark:text-slate-400 md:max-w-xs">
                    No image uploaded
                  </div>
                )}
                {room.images?.length > 1 ? (
                  <div className="mb-2 flex flex-wrap gap-2">
                    {room.images.slice(1, 5).map((imageUrl) => (
                      <img
                        key={`${room._id}-${imageUrl}`}
                        src={imageUrl}
                        alt={`Room ${room.roomNumber} thumbnail`}
                        className="h-12 w-12 rounded border border-slate-200 dark:border-[#1E2D4A] object-cover"
                      />
                    ))}
                  </div>
                ) : null}
                <p className="font-semibold text-slate-900 dark:text-slate-100">Room {room.roomNumber} - {room.type?.name ?? "Type"}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">{room.type?.code ?? ""} | ETB {room.pricePerNight}/night | Capacity {room.capacity}</p>
                <div className="mt-2 grid gap-2 md:max-w-sm">
                  <input
                    className="rounded-xl border border-[#E0E7FF] dark:border-[#1E2D4A] bg-[#F1F5FF] dark:bg-[#1A2540] px-3 py-2 text-sm text-[#0D1340] dark:text-[#EEF2FF] placeholder:text-[#8892B8]"
                    type="file"
                    accept="image/jpeg,image/png"
                    multiple
                    onChange={(e) => setReplacementImageFiles((previous) => ({ ...previous, [room._id]: Array.from(e.target.files ?? []) }))}
                  />
                  <button
                    className="w-fit rounded-xl border border-[#E0E7FF] dark:border-[#1E2D4A] px-3 py-2 text-xs font-semibold text-[#4B5580] dark:text-[#8892C8] hover:bg-[#F8FAFF] dark:hover:bg-[#141E35] transition-all duration-200"
                    type="button"
                    onClick={() => replaceRoomImages(room._id)}
                    disabled={replacingImagesForRoomId === room._id}
                  >
                    {replacingImagesForRoomId === room._id ? "Updating images..." : "Replace Images"}
                  </button>
                </div>
              </div>
              <select className="rounded-xl border border-[#E0E7FF] dark:border-[#1E2D4A] bg-[#F1F5FF] dark:bg-[#1A2540] px-2 py-1 text-sm text-[#0D1340] dark:text-[#EEF2FF]" value={room.status} onChange={(e) => updateRoomStatus(room._id, e.target.value as Room["status"])}>
                {statuses.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
              <button className="rounded-xl bg-rose-500 hover:bg-rose-600 px-3 py-2 text-sm font-semibold text-white transition-all duration-200" onClick={() => deleteRoom(room._id)}>
                Delete
              </button>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
