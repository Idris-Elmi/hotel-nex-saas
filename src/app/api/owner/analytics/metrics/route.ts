import { authorize } from "@/lib/auth/rbac";
import { connectDb } from "@/lib/db/mongoose";
import { fail, ok } from "@/lib/http";
import { getOperationalMetrics } from "@/modules/analytics/services/analytics.service";
import { resolveAnalyticsDateFilter } from "@/modules/analytics/utils/date-filter";

export async function GET(req: Request) {
  try {
    authorize(req, ["OWNER"]);
    await connectDb();

    const filter = resolveAnalyticsDateFilter(new URL(req.url).searchParams);
    const metrics = await getOperationalMetrics(filter);

    return ok({
      filter: {
        preset: filter.preset,
        from: filter.fromIso,
        to: filter.toIso,
        daysInRange: filter.daysInRange,
      },
      metrics,
    });
  } catch (error) {
    return fail(error);
  }
}
