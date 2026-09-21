import { AppError } from "@/lib/errors";

const CHAPA_SECRET_KEY = process.env.CHAPA_SECRET_KEY ?? "";
const CHAPA_BASE_URL = "https://api.chapa.co/v1";

export type ChapaInitializeParams = {
  amount: number;
  currency: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  tx_ref: string;
  callback_url?: string;
  return_url: string;
  customization?: {
    title?: string;
    description?: string;
  };
  meta?: Record<string, string>;
};

export type ChapaVerifyResult = {
  status: string;
  amount: string;
  currency: string;
  email: string;
  tx_ref: string;
  reference: string;
  payment_method: string;
};

export async function chapaInitialize(params: ChapaInitializeParams): Promise<{ checkout_url: string }> {
  if (!CHAPA_SECRET_KEY) {
    throw new AppError("CHAPA_SECRET_KEY is not configured", 503, "chapa_not_configured");
  }

  const res = await fetch(`${CHAPA_BASE_URL}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${CHAPA_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  const data = (await res.json().catch(() => ({}))) as {
    status?: string;
    message?: string;
    data?: { checkout_url?: string };
  };

  if (!res.ok || data.status !== "success" || !data.data?.checkout_url) {
    throw new AppError(data.message || "Chapa initialization failed", 502, "chapa_initialization_error");
  }

  return { checkout_url: data.data.checkout_url };
}

export async function chapaVerify(tx_ref: string): Promise<ChapaVerifyResult> {
  if (!CHAPA_SECRET_KEY) {
    throw new AppError("CHAPA_SECRET_KEY is not configured", 503, "chapa_not_configured");
  }

  const res = await fetch(`${CHAPA_BASE_URL}/transaction/verify/${encodeURIComponent(tx_ref)}`, {
    headers: { Authorization: `Bearer ${CHAPA_SECRET_KEY}` },
  });

  const data = (await res.json().catch(() => ({}))) as {
    status?: string;
    message?: string;
    data?: ChapaVerifyResult;
  };

  if (!res.ok || data.status !== "success" || !data.data) {
    throw new AppError(data.message || "Verification failed", 502, "chapa_verification_error");
  }

  return data.data;
}
