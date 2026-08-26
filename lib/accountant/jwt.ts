import { SignJWT, jwtVerify } from "jose";
import { ACCOUNTANT_SESSION_MAX_AGE_SEC } from "@/lib/accountant/constants";

function secretKey(): Uint8Array | null {
  const raw = process.env.ACCOUNTANT_SESSION_SECRET?.trim();
  if (!raw) return null;
  return new TextEncoder().encode(raw);
}

export async function signAccountantSessionToken(accountantAccessId: string): Promise<string> {
  const key = secretKey();
  if (!key) {
    throw new Error("ACCOUNTANT_SESSION_SECRET is not configured.");
  }
  return new SignJWT({})
    .setSubject(accountantAccessId)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ACCOUNTANT_SESSION_MAX_AGE_SEC}s`)
    .sign(key);
}

/** Verifies JWT; returns `AccountantAccess.id` or null. Safe for proxy (no throw on bad token). */
export async function verifyAccountantSessionToken(token: string | null | undefined): Promise<string | null> {
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
