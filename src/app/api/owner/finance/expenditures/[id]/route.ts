import { authorize } from "@/lib/auth/rbac";
import { connectDb } from "@/lib/db/mongoose";
import { fail, ok } from "@/lib/http";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { updateExpenditureSchema } from "@/lib/validation/finance";
import { ExpenditureModel } from "@/models/Expenditure";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    authorize(req, ["OWNER"]);
    await connectDb();

    const { id } = await params;
    const parsed = updateExpenditureSchema.safeParse(await req.json());
    if (!parsed.success) {
      throw new ValidationError("Invalid expenditure update", parsed.error.flatten());
    }

    const updatePayload = {
      ...parsed.data,
      date: parsed.data.date ? new Date(parsed.data.date) : undefined,
    };

    const expenditure = await ExpenditureModel.findByIdAndUpdate(id, updatePayload, { new: true, runValidators: true }).lean();
    if (!expenditure) {
      throw new NotFoundError("Expenditure not found");
    }

    return ok({ expenditure });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    authorize(req, ["OWNER"]);
    await connectDb();

    const { id } = await params;
    const expenditure = await ExpenditureModel.findByIdAndDelete(id).lean();
    if (!expenditure) {
      throw new NotFoundError("Expenditure not found");
    }

    return ok({ deleted: true });
  } catch (error) {
    return fail(error);
  }
}
