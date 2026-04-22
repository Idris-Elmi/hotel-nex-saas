import { authorize } from "@/lib/auth/rbac";
import { connectDb } from "@/lib/db/mongoose";
import { fail, ok } from "@/lib/http";
import { getRevenueBreakdown } from "@/modules/analytics/services/analytics.service";
import { resolveAnalyticsDateFilter } from "@/modules/analytics/utils/date-filter";

export async function GET(req: Request) {
  try {
    authorize(req, ["ADMIN"]);
    await connectDb();

    const filter = resolveAnalyticsDateFilter(new URL(req.url).searchParams);
    const revenue = await getRevenueBreakdown(filter);

    return ok({
      filter: {
        preset: filter.preset,
        from: filter.fromIso,
        to: filter.toIso,
        daysInRange: filter.daysInRange,
      },
      revenue,
    });
  } catch (error) {
    return fail(error);
  }
}
