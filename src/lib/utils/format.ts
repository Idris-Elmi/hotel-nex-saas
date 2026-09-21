export function getToken(): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem("hotel_saas_token_staff") ?? "";
}

export function formatCurrency(value: number, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "ETB",
    maximumFractionDigits,
  }).format(value);
}

export function formatAxisTick(value: number): string {
  if (value === 0) return "ETB0";
  if (value >= 1_000_000) return `ETB${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `ETB${(value / 1_000).toFixed(0)}K`;
  return `ETB${value}`;
}

export function formatCountAxisTick(value: number): string {
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return String(value);
}

export function formatDate(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString();
}
