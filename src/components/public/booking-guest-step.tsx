"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type BookingGuestStepProps = {
  roomId: string;
  arrivalDate: string;
  nights: string;
  adults: string;
  childCount: string;
  pricingPlan: string;
};

export function BookingGuestStep({
  roomId,
  arrivalDate,
  nights,
  adults,
  childCount,
  pricingPlan,
}: BookingGuestStepProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [identityFile, setIdentityFile] = useState<File | null>(null);
  const [identityPreviewUrl, setIdentityPreviewUrl] = useState("");
  const [identityDocumentUrl, setIdentityDocumentUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const urlDoc = searchParams.get("identityDocumentUrl");
    if (urlDoc && !identityDocumentUrl) {
      setIdentityDocumentUrl(urlDoc);
    }
  }, []);

  async function submitGuestInfo(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      if (!firstName.trim() || !lastName.trim() || !email.trim() || !phone.trim()) {
        setError("First Name, Last Name, Email and Phone are required.");
        return;
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        setError("Please enter a valid email address (must contain @ and a domain like .com).");
        return;
      }

      let documentUrl = identityDocumentUrl;

      if (identityFile) {
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
      }

      if (!documentUrl) {
        setError("Please upload Passport / ID file.");
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
        childCount,
        pricingPlan,
        firstName: guestData.firstName,
        lastName: guestData.lastName,
        fullName: guestData.fullName,
        email: guestData.email,
        phone: guestData.phone,
        address: guestData.address,
        identityDocumentUrl: documentUrl,
      });

      setIdentityDocumentUrl(documentUrl);

      router.push(`/booking/customer-auth?${params.toString()}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submitGuestInfo} className="mt-6 grid gap-4 md:grid-cols-2">
      {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 md:col-span-2 dark:bg-red-900/20 dark:text-red-400">{error}</p> : null}

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 md:col-span-2 dark:bg-[#243044] dark:border-[#2a3a52]">
        <p className="text-sm font-bold text-slate-900 dark:text-white">Guest Information</p>
        <p className="mt-1 text-xs text-slate-600 dark:text-[#94a3b8]">Enter guest details and upload Passport / ID before continuing.</p>
      </div>

      <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-[#94a3b8]">
        First Name *
        <input className="rounded-lg border border-slate-300 px-3 py-2 dark:bg-[#243044] dark:border-[#2a3a52] dark:text-white dark:placeholder:text-[#4a5568] dark:focus:ring-[#d4a644]/40 dark:focus:border-[#d4a644]" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
      </label>

      <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-[#94a3b8]">
        Last Name *
        <input className="rounded-lg border border-slate-300 px-3 py-2 dark:bg-[#243044] dark:border-[#2a3a52] dark:text-white dark:placeholder:text-[#4a5568] dark:focus:ring-[#d4a644]/40 dark:focus:border-[#d4a644]" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
      </label>

      <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-[#94a3b8]">
        Email *
        <input className="rounded-lg border border-slate-300 px-3 py-2 dark:bg-[#243044] dark:border-[#2a3a52] dark:text-white dark:placeholder:text-[#4a5568] dark:focus:ring-[#d4a644]/40 dark:focus:border-[#d4a644]" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </label>

      <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-[#94a3b8]">
        Phone *
        <input className="rounded-lg border border-slate-300 px-3 py-2 dark:bg-[#243044] dark:border-[#2a3a52] dark:text-white dark:placeholder:text-[#4a5568] dark:focus:ring-[#d4a644]/40 dark:focus:border-[#d4a644]" value={phone} onChange={(e) => setPhone(e.target.value)} required />
      </label>

      <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-[#94a3b8] md:col-span-2">
        Address
        <input className="rounded-lg border border-slate-300 px-3 py-2 dark:bg-[#243044] dark:border-[#2a3a52] dark:text-white dark:placeholder:text-[#4a5568] dark:focus:ring-[#d4a644]/40 dark:focus:border-[#d4a644]" value={address} onChange={(e) => setAddress(e.target.value)} />
      </label>

      <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-[#94a3b8] md:col-span-2">
        Upload Passport / ID * (jpg, png, pdf, max 5MB)
        <input
          className="rounded-lg border border-slate-300 px-3 py-2 dark:bg-[#243044] dark:border-[#2a3a52] dark:text-white dark:file:text-[#94a3b8] dark:file:bg-[#2a3a52]"
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

      {identityFile ? <p className="text-xs text-slate-600 md:col-span-2 dark:text-[#94a3b8]">Selected file: {identityFile.name}</p> : null}
      {!identityFile && identityDocumentUrl ? <p className="text-xs text-slate-600 md:col-span-2 dark:text-[#94a3b8]">Previously uploaded document on file. Choose a new file to replace it.</p> : null}

      {identityPreviewUrl ? (
        <div className="md:col-span-2">
          <p className="mb-1 text-xs font-semibold text-slate-700 dark:text-[#94a3b8]">ID/Passport Preview</p>
          <img src={identityPreviewUrl} alt="Selected identity document preview" className="max-h-56 rounded-lg border border-slate-300 object-contain dark:border-[#2a3a52]" />
        </div>
      ) : null}

      <button className="w-full py-3 rounded-xl text-sm font-bold text-white bg-[#c0392b] hover:bg-[#a93226] dark:bg-[#c0392b] dark:hover:bg-[#a93226] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-[#c0392b]/20 transition-all duration-200 md:col-span-2" type="submit" disabled={submitting}>
        {submitting ? "Uploading and continuing..." : "Continue"}
      </button>
    </form>
  );
}
