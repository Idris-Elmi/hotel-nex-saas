import { authorize } from "@/lib/auth/rbac";
import { connectDb } from "@/lib/db/mongoose";
import { fail, ok } from "@/lib/http";
import { ValidationError } from "@/lib/errors";
import { createExpenditureSchema } from "@/lib/validation/finance";
import { ExpenditureModel } from "@/models/Expenditure";
import { resolveAnalyticsDateFilter } from "@/modules/analytics/utils/date-filter";

export async function GET(req: Request) {
  try {
    authorize(req, ["OWNER", "ADMIN"]);
    await connectDb();

    const filter = resolveAnalyticsDateFilter(new URL(req.url).searchParams);
    const expenditures = await ExpenditureModel.find({
      date: { $gte: filter.from, $lt: filter.toExclusive },
    }).sort({ date: -1 }).lean();

    return ok({
      filter: {
        preset: filter.preset,
        from: filter.fromIso,
        to: filter.toIso,
        daysInRange: filter.daysInRange,
      },
      expenditures,
    });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(req: Request) {
  try {
    const claims = authorize(req, ["OWNER", "ADMIN"]);
    await connectDb();

    const parsed = createExpenditureSchema.safeParse(await req.json());
    if (!parsed.success) {
      throw new ValidationError("Invalid expenditure payload", parsed.error.flatten());
    }

    const expenditure = await ExpenditureModel.create({
      title: parsed.data.title,
      category: parsed.data.category,
      amount: parsed.data.amount,
      description: parsed.data.description ?? "",
      date: new Date(parsed.data.date),
      paymentMethod: parsed.data.paymentMethod,
      createdBy: claims.sub,
    });

    return ok({ expenditure }, 201);
  } catch (error) {
    return fail(error);
  }
}
