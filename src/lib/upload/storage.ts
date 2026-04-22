import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { appConfig } from "@/lib/config";
import { ValidationError } from "@/lib/errors";

const allowedTypes = new Set(["image/jpeg", "image/png", "application/pdf"]);
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export async function saveIdentityDocument(file: File) {
  if (!allowedTypes.has(file.type)) {
    throw new ValidationError("Unsupported file type");
  }

  if (file.size > MAX_SIZE_BYTES) {
    throw new ValidationError("File is too large (max 5MB)");
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = file.type === "application/pdf" ? "pdf" : file.type === "image/png" ? "png" : "jpg";

  const uploadDir = path.join(process.cwd(), appConfig.uploadDir);
  await mkdir(uploadDir, { recursive: true });

  const fileName = `${Date.now()}-${randomUUID()}.${ext}`;
  const filePath = path.join(uploadDir, fileName);
  await writeFile(filePath, bytes);

  return `/uploads/ids/${fileName}`;
}

export async function savePaymentReceipt(file: File) {
  if (!allowedTypes.has(file.type)) {
    throw new ValidationError("Unsupported file type");
  }

  if (file.size > MAX_SIZE_BYTES) {
    throw new ValidationError("File is too large (max 5MB)");
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = file.type === "application/pdf" ? "pdf" : file.type === "image/png" ? "png" : "jpg";

  const uploadDir = path.join(process.cwd(), "public", "uploads", "payments");
  await mkdir(uploadDir, { recursive: true });

  const fileName = `${Date.now()}-${randomUUID()}.${ext}`;
  const filePath = path.join(uploadDir, fileName);
  await writeFile(filePath, bytes);

  return `/uploads/payments/${fileName}`;
}

export async function saveRoomImage(file: File) {
  if (!allowedTypes.has(file.type) || file.type === "application/pdf") {
    throw new ValidationError("Unsupported file type");
  }

  if (file.size > MAX_SIZE_BYTES) {
    throw new ValidationError("File is too large (max 5MB)");
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = file.type === "image/png" ? "png" : "jpg";

  const uploadDir = path.join(process.cwd(), "public", "uploads", "rooms");
  await mkdir(uploadDir, { recursive: true });

  const fileName = `${Date.now()}-${randomUUID()}.${ext}`;
  const filePath = path.join(uploadDir, fileName);
  await writeFile(filePath, bytes);

  return `/uploads/rooms/${fileName}`;
}
