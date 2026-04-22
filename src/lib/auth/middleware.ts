import { fail } from "@/lib/http";
import { authorize } from "@/lib/auth/rbac";
import type { JwtRole } from "@/lib/auth/jwt";

export function withRoles(
  roles: JwtRole[],
  handler: (req: Request, context?: { params?: Promise<Record<string, string>> }) => Promise<Response>,
) {
  return async (req: Request, context?: { params?: Promise<Record<string, string>> }) => {
    try {
      authorize(req, roles);
      return await handler(req, context);
    } catch (error) {
      return fail(error);
    }
  };
}
