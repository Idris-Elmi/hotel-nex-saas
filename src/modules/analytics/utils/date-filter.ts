import { addDays, endOfDay, isAfter, parseISO, startOfDay, subDays } from "date-fns";
import { ValidationError } from "@/lib/errors";

export type AnalyticsPreset = "7d" | "30d" | "90d" | "ytd" | "custom";
export type BookingTrendPeriod = "today" | "7d" | "30d" | "12m";
export type OccupancyPeriod = "today" | "weekly" | "monthly" | "yearly";

export type AnalyticsDateFilter = {
  preset: AnalyticsPreset;
  from: Date;
  to: Date;
  toExclusive: Date;
  daysInRange: number;
  fromIso: string;
  toIso: string;
};

function parseDate(value: string | null): Date | null {
  if (!value) {
    return null;
  }

  const parsed = parseISO(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

export function resolveAnalyticsDateFilter(searchParams: URLSearchParams): AnalyticsDateFilter {
  const preset = (searchParams.get("preset") ?? "30d") as AnalyticsPreset;
  const now = new Date();
  const todayStart = startOfDay(now);

  let from: Date;
  let to: Date;

  if (preset === "custom") {
    const fromRaw = parseDate(searchParams.get("from"));
    const toRaw = parseDate(searchParams.get("to"));

    if (!fromRaw || !toRaw) {
      throw new ValidationError("Custom date filter requires valid from and to dates (YYYY-MM-DD)");
    }

    from = startOfDay(fromRaw);
    to = endOfDay(toRaw);
  } else if (preset === "7d") {
    from = startOfDay(subDays(todayStart, 6));
    to = endOfDay(now);
  } else if (preset === "90d") {
    from = startOfDay(subDays(todayStart, 89));
    to = endOfDay(now);
  } else if (preset === "ytd") {
    from = startOfDay(new Date(now.getFullYear(), 0, 1));
    to = endOfDay(now);
  } else {
    from = startOfDay(subDays(todayStart, 29));
    to = endOfDay(now);
  }

  if (isAfter(from, to)) {
    throw new ValidationError("from date must be before or equal to to date");
  }

  const toExclusive = addDays(startOfDay(to), 1);
  const daysInRange = Math.max(Math.round((toExclusive.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)), 1);

  return {
    preset,
    from,
    to,
    toExclusive,
    daysInRange,
    fromIso: from.toISOString(),
    toIso: to.toISOString(),
  };
}
