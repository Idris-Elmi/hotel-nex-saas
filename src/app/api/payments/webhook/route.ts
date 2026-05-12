import { fail } from "@/lib/http";

import { ValidationError } from "@/lib/errors";

export async function POST(req: Request) {
  try {
    void req;
    
    throw new ValidationError("Webhook endpoint is disabled in manual payment mode.");
  } catch (error) {
    return fail(error);
  }
}
