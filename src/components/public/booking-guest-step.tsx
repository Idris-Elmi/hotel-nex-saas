"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type BookingGuestStepProps = {
  roomId: string;
  arrivalDate: string;
  nights: string;
  adults: string;
  children: string;
  pricingPlan: string;
};

export function BookingGuestStep({
  roomId,
  arrivalDate,
  nights,
  adults,
  children,
  pricingPlan,
}: BookingGuestStepProps) {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [identityFile, setIdentityFile] = useState<File | null>(null);
  const [identityPreviewUrl, setIdentityPreviewUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submitGuestInfo(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      if (!firstName.trim() || !lastName.trim() || !email.trim() || !phone.trim()) {
        setError("First Name, Last Name, Email and Phone are required.");
        return;
      }

      if (!identityFile) {
        setError("Please upload Passport / ID file.");
        return;
      }

      let documentUrl = "";

      const form = new FormData();
      form.append("file", identityFile);

      const uploadResponse = await fetch("/api/uploads/id-doc", {
        method: "POST",
        body: form,
      });

      const uploadPayload = await uploadResponse.json().catch(() => ({}));
      if (!uploadResponse.ok) {
        setError(uploadPayload.message ?? "Failed to upload ID/passport file.");
        return;
      }

      documentUrl = String(uploadPayload.url ?? "").trim();

      if (!documentUrl) {
        setError("Failed to save uploaded Passport / ID file.");
        return;
      }

      const guestData = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        fullName: `${firstName.trim()} ${lastName.trim()}`.trim(),
        email: email.trim(),
        phone: phone.trim(),
        address: address.trim(),
        passportDocumentUrl: documentUrl,
      };

      sessionStorage.setItem("booking_guest_info", JSON.stringify(guestData));

      const params = new URLSearchParams({
        roomId,
        arrivalDate,
        nights,
        adults,
        children,
        pricingPlan,
        firstName: guestData.firstName,
        lastName: guestData.lastName,
        fullName: guestData.fullName,
        email: guestData.email,
        phone: guestData.phone,
        address: guestData.address,
        identityDocumentUrl: documentUrl,
      });

      router.push(`/booking/customer-auth?${params.toString()}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submitGuestInfo} className="mt-6 grid gap-4 md:grid-cols-2">
      {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 md:col-span-2">{error}</p> : null}

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 md:col-span-2">
        <p className="text-sm font-bold text-slate-900">Guest Information</p>
        <p className="mt-1 text-xs text-slate-600">Enter guest details and upload Passport / ID before continuing.</p>
      </div>

      <label className="grid gap-1 text-sm font-semibold text-slate-700">
        First Name *
        <input className="rounded-lg border border-slate-300 px-3 py-2" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
      </label>

      <label className="grid gap-1 text-sm font-semibold text-slate-700">
        Last Name *
        <input className="rounded-lg border border-slate-300 px-3 py-2" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
      </label>

      <label className="grid gap-1 text-sm font-semibold text-slate-700">
        Email *
        <input className="rounded-lg border border-slate-300 px-3 py-2" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </label>

      <label className="grid gap-1 text-sm font-semibold text-slate-700">
        Phone *
        <input className="rounded-lg border border-slate-300 px-3 py-2" value={phone} onChange={(e) => setPhone(e.target.value)} required />
      </label>

      <label className="grid gap-1 text-sm font-semibold text-slate-700 md:col-span-2">
        Address
        <input className="rounded-lg border border-slate-300 px-3 py-2" value={address} onChange={(e) => setAddress(e.target.value)} />
      </label>

      <label className="grid gap-1 text-sm font-semibold text-slate-700 md:col-span-2">
        Upload Passport / ID * (jpg, png, pdf, max 5MB)
        <input
          className="rounded-lg border border-slate-300 px-3 py-2"
          type="file"
          accept="image/jpeg,image/png,application/pdf"
          onChange={(e) => {
            const file = e.target.files?.[0] ?? null;
            setIdentityFile(file);

            if (!file) {
              setIdentityPreviewUrl("");
              return;
            }

            if (file.type.startsWith("image/")) {
              setIdentityPreviewUrl(URL.createObjectURL(file));
              return;
            }

            setIdentityPreviewUrl("");
          }}
          required
        />
      </label>

      {identityFile ? <p className="text-xs text-slate-600 md:col-span-2">Selected file: {identityFile.name}</p> : null}

      {identityPreviewUrl ? (
        <div className="md:col-span-2">
          <p className="mb-1 text-xs font-semibold text-slate-700">ID/Passport Preview</p>
          <img src={identityPreviewUrl} alt="Selected identity document preview" className="max-h-56 rounded-lg border border-slate-300 object-contain" />
        </div>
      ) : null}

      <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 md:col-span-2" type="submit" disabled={submitting}>
        {submitting ? "Uploading and continuing..." : "Continue"}
      </button>
    </form>
  );
}
