import { authorize } from "@/lib/auth/rbac";
import { connectDb } from "@/lib/db/mongoose";
import { fail, ok } from "@/lib/http";
import { ValidationError } from "@/lib/errors";
import { createRevenueEntrySchema } from "@/lib/validation/finance";
import { RevenueEntryModel } from "@/models/RevenueEntry";
import { resolveAnalyticsDateFilter } from "@/modules/analytics/utils/date-filter";

export async function GET(req: Request) {
  try {
    authorize(req, ["OWNER", "ADMIN"]);
    await connectDb();

    const filter = resolveAnalyticsDateFilter(new URL(req.url).searchParams);
    const revenues = await RevenueEntryModel.find({
      date: { $gte: filter.from, $lt: filter.toExclusive },
    }).sort({ date: -1 }).lean();

    return ok({
      filter: {
        preset: filter.preset,
        from: filter.fromIso,
        to: filter.toIso,
        daysInRange: filter.daysInRange,
      },
      revenues,
    });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(req: Request) {
  try {
    const claims = authorize(req, ["OWNER", "ADMIN"]);
    await connectDb();

    const parsed = createRevenueEntrySchema.safeParse(await req.json());
    if (!parsed.success) {
      throw new ValidationError("Invalid revenue payload", parsed.error.flatten());
    }

    const revenue = await RevenueEntryModel.create({
      title: parsed.data.title,
      source: parsed.data.source,
      amount: parsed.data.amount,
      description: parsed.data.description ?? "",
      date: new Date(parsed.data.date),
      bookingId: parsed.data.bookingId || undefined,
      createdBy: claims.sub,
    });

    return ok({ revenue }, 201);
  } catch (error) {
    return fail(error);
  }
}
