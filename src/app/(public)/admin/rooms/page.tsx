"use client";

import { useEffect, useRef, useState } from "react";
import { RoleGate } from "@/components/auth/RoleGate";

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

export default function AdminRoomsPage() {
  return (
    <RoleGate allow={["ADMIN"]} loginRoute="/auth/staff-signin">
      <AdminRoomsContent />
    </RoleGate>
  );
}

function AdminRoomsContent() {
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
    return localStorage.getItem("hotel_saas_token") ?? "";
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
        fetch("/api/admin/room-types", { headers, cache: "no-store" }),
        fetch("/api/admin/rooms", { headers, cache: "no-store" }),
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

    const res = await fetch("/api/admin/room-types", {
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

    const res = await fetch("/api/admin/rooms", {
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
      const res = await fetch(`/api/admin/rooms/${roomId}`, {
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

    const res = await fetch(`/api/admin/rooms/${roomId}`, {
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
  }

  async function deleteRoom(roomId: string) {
    const authHeader = requireAuthHeader();

    const res = await fetch(`/api/admin/rooms/${roomId}`, {
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
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchAll();
    }, 0);

    return () => {
      window.clearTimeout(timer);
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
    // Run once after mount to load persisted room data for admin users.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="mb-3 text-3xl font-black text-slate-900">Room Management</h1>
      <p className="mb-6 text-slate-600">Manage Room Types and Rooms used by booking and reception status workflows.</p>

      {error ? <p className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {toast ? (
        <div
          className={`mb-4 rounded-xl px-3 py-2 text-sm ${
            toast.type === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border border-amber-200 bg-amber-50 text-amber-800"
          }`}
        >
          {toast.message}
        </div>
      ) : null}
      {loading ? <p className="mb-4 text-sm text-slate-500">Loading...</p> : null}

      <div className="mb-6">
        <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white" onClick={fetchAll}>
          Refresh Room Data
        </button>
      </div>

      <section className="mb-8 grid gap-6 md:grid-cols-2">
        <form onSubmit={createRoomType} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Create Room Type</h2>
          <input className="rounded-lg border border-slate-300 px-3 py-2" placeholder="Type name" value={newType.name} onChange={(e) => setNewType((v) => ({ ...v, name: e.target.value }))} required />
          <input className="rounded-lg border border-slate-300 px-3 py-2" placeholder="Code (e.g. DELUXE)" value={newType.code} onChange={(e) => setNewType((v) => ({ ...v, code: e.target.value }))} required />
          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            Breakfast Add-on Price (USD)
            <input
              className="rounded-lg border border-slate-300 px-3 py-2"
              type="number"
              min={0}
              step="1"
              placeholder="e.g. 20"
              value={newType.breakfastAddonPrice}
              onChange={(e) => setNewType((v) => ({ ...v, breakfastAddonPrice: Number(e.target.value) }))}
              required
            />
            <span className="text-xs font-normal text-slate-500">Extra cost added when guest selects bed & breakfast.</span>
          </label>
          <button className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white" type="submit">Create Type</button>
        </form>

        <form onSubmit={createRoom} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Create Room</h2>
          <input className="rounded-lg border border-slate-300 px-3 py-2" placeholder="Room number" value={newRoom.roomNumber} onChange={(e) => setNewRoom((v) => ({ ...v, roomNumber: e.target.value }))} required />
          <select className="rounded-lg border border-slate-300 px-3 py-2" value={newRoom.type} onChange={(e) => setNewRoom((v) => ({ ...v, type: e.target.value }))} required>
            <option value="">Select room type</option>
            {roomTypes.map((type) => (
              <option key={type._id} value={type._id}>{type.name} ({type.code})</option>
            ))}
          </select>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            Price Per Night (USD)
            <input
              className="rounded-lg border border-slate-300 px-3 py-2"
              type="number"
              min={0}
              step="1"
              placeholder="e.g. 180"
              value={newRoom.pricePerNight}
              onChange={(e) => setNewRoom((v) => ({ ...v, pricePerNight: Number(e.target.value) }))}
              required
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            Capacity (Number of Guests)
            <input
              className="rounded-lg border border-slate-300 px-3 py-2"
              type="number"
              min={1}
              step="1"
              placeholder="e.g. 2"
              value={newRoom.capacity}
              onChange={(e) => setNewRoom((v) => ({ ...v, capacity: Number(e.target.value) }))}
              required
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            Room Images (multiple)
            <input
              className="rounded-lg border border-slate-300 px-3 py-2"
              type="file"
              accept="image/jpeg,image/png"
              multiple
              onChange={(e) => setNewRoomImageFiles(Array.from(e.target.files ?? []))}
            />
          </label>
          {newRoomImageFiles.length > 0 ? <p className="text-xs text-slate-500">{newRoomImageFiles.length} image(s) selected.</p> : null}
          <button className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white" type="submit">Create Room</button>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-xl font-bold text-slate-900">Rooms</h2>
        <div className="grid gap-3">
          {rooms.map((room) => (
            <article key={room._id} className="grid gap-2 rounded-xl border border-slate-200 p-4 md:grid-cols-[1fr_auto_auto] md:items-center">
              <div>
                {room.images?.[0] ? (
                  <img
                    src={room.images[0]}
                    alt={`Room ${room.roomNumber} preview`}
                    className="mb-2 h-28 w-full rounded-lg border border-slate-200 object-cover md:max-w-xs"
                  />
                ) : (
                  <div className="mb-2 flex h-28 w-full items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-xs text-slate-500 md:max-w-xs">
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
                        className="h-12 w-12 rounded border border-slate-200 object-cover"
                      />
                    ))}
                  </div>
                ) : null}
                <p className="font-semibold text-slate-900">Room {room.roomNumber} - {room.type?.name ?? "Type"}</p>
                <p className="text-sm text-slate-600">{room.type?.code ?? ""} | ${room.pricePerNight}/night | Capacity {room.capacity}</p>
                <div className="mt-2 grid gap-2 md:max-w-sm">
                  <input
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    type="file"
                    accept="image/jpeg,image/png"
                    multiple
                    onChange={(e) => setReplacementImageFiles((previous) => ({ ...previous, [room._id]: Array.from(e.target.files ?? []) }))}
                  />
                  <button
                    className="w-fit rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-800"
                    type="button"
                    onClick={() => replaceRoomImages(room._id)}
                    disabled={replacingImagesForRoomId === room._id}
                  >
                    {replacingImagesForRoomId === room._id ? "Updating images..." : "Replace Images"}
                  </button>
                </div>
              </div>
              <select className="rounded-lg border border-slate-300 px-2 py-1" value={room.status} onChange={(e) => updateRoomStatus(room._id, e.target.value as Room["status"])}>
                {statuses.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
              <button className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white" onClick={() => deleteRoom(room._id)}>
                Delete
              </button>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
