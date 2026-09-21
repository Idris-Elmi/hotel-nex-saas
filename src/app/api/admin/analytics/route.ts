import { authorize } from "@/lib/auth/rbac";
import { connectDb } from "@/lib/db/mongoose";
import { fail, ok } from "@/lib/http";
import { getAdminAnalyticsOverview } from "@/modules/analytics/services/analytics.service";
import { resolveAnalyticsDateFilter } from "@/modules/analytics/utils/date-filter";

export async function GET(req: Request) {
  try {
    authorize(req, ["ADMIN"]);
    await connectDb();
    const filter = resolveAnalyticsDateFilter(new URL(req.url).searchParams);
    const summary = await getAdminAnalyticsOverview(filter);
    return ok(summary);
  } catch (error) {
    return fail(error);
  }
}
