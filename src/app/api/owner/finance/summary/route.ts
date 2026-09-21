import { authorize } from "@/lib/auth/rbac";
import { connectDb } from "@/lib/db/mongoose";
import { fail, ok } from "@/lib/http";
import { getFinancialSummary, type FinancePeriod } from "@/modules/finance/services/finance.service";
import { resolveAnalyticsDateFilter } from "@/modules/analytics/utils/date-filter";
import { ValidationError } from "@/lib/errors";

const chartPeriods: FinancePeriod[] = ["daily", "weekly", "monthly", "yearly"];

export async function GET(req: Request) {
  try {
    authorize(req, ["OWNER"]);
    await connectDb();

    const searchParams = new URL(req.url).searchParams;
    const filter = resolveAnalyticsDateFilter(searchParams);
    const chartPeriodParam = (searchParams.get("chartPeriod") ?? "monthly") as FinancePeriod;

    if (!chartPeriods.includes(chartPeriodParam)) {
      throw new ValidationError("Invalid chartPeriod. Use daily, weekly, monthly, or yearly.");
    }

    const summary = await getFinancialSummary(filter, chartPeriodParam);

    return ok({
      filter: {
        preset: filter.preset,
        from: filter.fromIso,
        to: filter.toIso,
        daysInRange: filter.daysInRange,
      },
      ...summary,
    });
  } catch (error) {
    return fail(error);
  }
}
