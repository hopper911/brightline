/**
 * Accountant session cookie + JWT verify — no `next/headers` and not under
 * `lib/accountant/` so `proxy.ts` can import this on CLI production deploys
 * (`.vercelignore` excludes the accountant portal tree).
 */
import { jwtVerify } from "jose";

export const ACCOUNTANT_SESSION_COOKIE = "accountant_session";

function secretKey(): Uint8Array | null {
  const raw = process.env.ACCOUNTANT_SESSION_SECRET?.trim();
  if (!raw) return null;
  return new TextEncoder().encode(raw);
}

/** Verifies JWT; returns `AccountantAccess.id` or null. Safe for proxy (no throw on bad token). */
export async function verifyAccountantSessionToken(
  token: string | null | undefined
): Promise<string | null> {
  if (!token?.trim()) return null;
  const key = secretKey();
  if (!key) return null;
  try {
    const { payload } = await jwtVerify(token.trim(), key, { algorithms: ["HS256"] });
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}
