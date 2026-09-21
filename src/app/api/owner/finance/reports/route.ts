import { authorize } from "@/lib/auth/rbac";
import { connectDb } from "@/lib/db/mongoose";
import { fail, ok } from "@/lib/http";
import { getFinancialReport, type FinancePeriod } from "@/modules/finance/services/finance.service";
import { resolveAnalyticsDateFilter } from "@/modules/analytics/utils/date-filter";
import { ValidationError } from "@/lib/errors";

const allowedPeriods: FinancePeriod[] = ["daily", "weekly", "monthly", "yearly"];

export async function GET(req: Request) {
  try {
    authorize(req, ["OWNER"]);
    await connectDb();

    const searchParams = new URL(req.url).searchParams;
    const filter = resolveAnalyticsDateFilter(searchParams);
    const periodParam = (searchParams.get("period") ?? "monthly") as FinancePeriod;

    if (!allowedPeriods.includes(periodParam)) {
      throw new ValidationError("Invalid period. Use daily, weekly, monthly, or yearly.");
    }

    const report = await getFinancialReport(filter, periodParam);

    return ok({
      filter: {
        preset: filter.preset,
        from: filter.fromIso,
        to: filter.toIso,
        daysInRange: filter.daysInRange,
      },
      report,
    });
  } catch (error) {
    return fail(error);
  }
}
