
import { fail } from "@/lib/http";
import { ValidationError } from "@/lib/errors";

export async function POST(req: Request) {
  try {
    void req;
    
    throw new ValidationError("Online gateway payment is disabled. Submit manual payment proof instead.");
  } catch (error) {
    return fail(error);
  }
}
