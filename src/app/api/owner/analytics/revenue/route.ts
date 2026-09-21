import { authorize } from "@/lib/auth/rbac";
import { connectDb } from "@/lib/db/mongoose";
import { fail, ok } from "@/lib/http";
import { getMonthlyRevenue } from "@/modules/analytics/services/analytics.service";

export async function GET(req: Request) {
  try {
    authorize(req, ["OWNER"]);
    await connectDb();

    const monthlyRevenue = await getMonthlyRevenue();

    return ok({ data: monthlyRevenue });
  } catch (error) {
    return fail(error);
  }
}
