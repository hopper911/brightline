import { timingSafeEqual } from "@/lib/crypto-buffer";
import { authorizeAdminRequest } from "@/lib/admin-auth";

export type AuthResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

function timingSafeMatch(token: string, secret: string | undefined): boolean {
  if (!secret) return false;
  const a = Buffer.from(token, "utf8");
  const b = Buffer.from(secret, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Allows Studio OS JSON APIs for:
 * - logged-in admin (admin_access cookie)
 * - automation (Airtable/n8n) via `Authorization: Bearer <token>`
 *
 * Token may match `AUTOMATION_API_SECRET` and/or `BL_INTERNAL_API_TOKEN` (either env may be set;
 * if both are set, the bearer must match one of them).
 */
export async function requireProjectsApiAuth(req: Request): Promise<AuthResult> {
  if (await authorizeAdminRequest(req)) {
    return { ok: true };
  }

  const primary = process.env.AUTOMATION_API_SECRET?.trim();
  const internal = process.env.BL_INTERNAL_API_TOKEN?.trim();
  if (!primary && !internal) {
    return { ok: false, status: 401, error: "Unauthorized." };
  }

  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) {
    return { ok: false, status: 401, error: "Unauthorized." };
  }

  if (timingSafeMatch(token, primary) || timingSafeMatch(token, internal)) {
    return { ok: true };
  }

  return { ok: false, status: 401, error: "Unauthorized." };
}
