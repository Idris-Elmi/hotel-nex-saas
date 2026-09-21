import { getHandler } from "@/lib/auth/options";

export async function GET(
  req: Request,
  context: { params: Promise<Record<string, string | string[]>> },
) {
  return getHandler()(req, context);
}

export async function POST(
  req: Request,
  context: { params: Promise<Record<string, string | string[]>> },
) {
  return getHandler()(req, context);
}
