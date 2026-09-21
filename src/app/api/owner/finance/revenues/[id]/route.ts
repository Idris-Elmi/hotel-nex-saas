import { authorize } from "@/lib/auth/rbac";
import { connectDb } from "@/lib/db/mongoose";
import { fail, ok } from "@/lib/http";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { updateRevenueEntrySchema } from "@/lib/validation/finance";
import { RevenueEntryModel } from "@/models/RevenueEntry";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    authorize(req, ["OWNER"]);
    await connectDb();

    const { id } = await params;
    const parsed = updateRevenueEntrySchema.safeParse(await req.json());
    if (!parsed.success) {
      throw new ValidationError("Invalid revenue update", parsed.error.flatten());
    }

    const updatePayload = {
      ...parsed.data,
      date: parsed.data.date ? new Date(parsed.data.date) : undefined,
      bookingId: parsed.data.bookingId || undefined,
    };

    const revenue = await RevenueEntryModel.findByIdAndUpdate(id, updatePayload, { new: true, runValidators: true }).lean();
    if (!revenue) {
      throw new NotFoundError("Revenue entry not found");
    }

    return ok({ revenue });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    authorize(req, ["OWNER"]);
    await connectDb();

    const { id } = await params;
    const revenue = await RevenueEntryModel.findByIdAndDelete(id).lean();
    if (!revenue) {
      throw new NotFoundError("Revenue entry not found");
    }

    return ok({ deleted: true });
  } catch (error) {
    return fail(error);
  }
}
