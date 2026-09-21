import { authorize } from "@/lib/auth/rbac";
import { connectDb } from "@/lib/db/mongoose";
import { fail, ok } from "@/lib/http";
import { getAdminAnalyticsOverview, getBookingTrends, getOccupancyTrend, getTopRoomTypes, getFinanceOverview, getExpenditureAnalytics } from "@/modules/analytics/services/analytics.service";
import { resolveAnalyticsDateFilter, type BookingTrendPeriod, type OccupancyPeriod } from "@/modules/analytics/utils/date-filter";
import type { FinanceOverviewPeriod, ExpenditureAnalyticsPeriod } from "@/modules/analytics/services/analytics.service";
import { ValidationError } from "@/lib/errors";

export async function GET(req: Request) {
  try {
    authorize(req, ["OWNER"]);
    await connectDb();
    const searchParams = new URL(req.url).searchParams;
    const filter = resolveAnalyticsDateFilter(searchParams);

    const chartParam = searchParams.get("chart");
    if (chartParam === "bookingTrends") {
      const period = (searchParams.get("period") ?? "30d") as BookingTrendPeriod;
      const data = await getBookingTrends(period);
      return ok({ data });
    }
    if (chartParam === "occupancyTrend") {
      const period = (searchParams.get("period") ?? "monthly") as OccupancyPeriod;
      const data = await getOccupancyTrend(period);
      return ok({ data });
    }
    if (chartParam === "topRoomTypes") {
      const data = await getTopRoomTypes(filter);
      return ok({ data });
    }
    if (chartParam === "financeOverview") {
      const period = (searchParams.get("period") ?? "monthly") as FinanceOverviewPeriod;
      if (!["today", "7d", "30d", "monthly", "quarterly", "yearly"].includes(period)) {
        throw new ValidationError("Invalid finance period");
      }
      const data = await getFinanceOverview(period);
      return ok(data);
    }
    if (chartParam === "expenditureAnalytics") {
      const period = (searchParams.get("period") ?? "monthly") as ExpenditureAnalyticsPeriod;
      if (!["daily", "weekly", "monthly", "yearly"].includes(period)) {
        throw new ValidationError("Invalid expenditure period");
      }
      const data = await getExpenditureAnalytics(period);
      return ok(data);
    }

    const summary = await getAdminAnalyticsOverview(filter);
    return ok(summary);
  } catch (error) {
    return fail(error);
  }
}
