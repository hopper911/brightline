import { SignJWT } from "jose";
import { ACCOUNTANT_SESSION_MAX_AGE_SEC } from "@/lib/accountant/constants";

export { verifyAccountantSessionToken } from "@/lib/accountant-cookie";

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
