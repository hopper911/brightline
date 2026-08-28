import { createHmac, randomBytes } from "node:crypto";
import { timingSafeEqual } from "@/lib/crypto-buffer";

export const ADMIN_SESSION_MAX_AGE_SEC = 60 * 60 * 8;
const COOKIE_VERSION = "v1";

function getSigningSecret(): string | null {
  const dedicated = process.env.ADMIN_SESSION_SECRET?.trim();
  if (dedicated) {
    if (dedicated.length < 32) {
      console.error(
        "ADMIN_SESSION_SECRET must be at least 32 characters. Admin sessions will not be issued until it is updated."
      );
      return null;
    }
    return dedicated;
  }

  // Production must use a dedicated secret — do not derive from the access code.
  if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production") {
    console.error(
      "ADMIN_SESSION_SECRET is required in production. Admin sessions will not be issued until it is set."
    );
    return null;
  }

  const accessCode = process.env.ADMIN_ACCESS_CODE?.trim();
  if (!accessCode) return null;

  // Dev-only fallback: derive a server-only secret from the access code.
  return createHmac("sha256", "brightline-admin-session-v1")
    .update(accessCode)
    .digest("hex");
}

export function createAdminSessionToken(): string | null {
  const secret = getSigningSecret();
  if (!secret) return null;

  const exp = Math.floor(Date.now() / 1000) + ADMIN_SESSION_MAX_AGE_SEC;
  const nonce = randomBytes(16).toString("hex");
  const payload = `${COOKIE_VERSION}.${exp}.${nonce}`;
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyAdminSessionToken(raw: string | null | undefined): boolean {
  const token = raw?.trim();
  if (!token || token === "true") return false;

  const secret = getSigningSecret();
  if (!secret) return false;

  const parts = token.split(".");
  if (parts.length !== 4 || parts[0] !== COOKIE_VERSION) return false;

  const exp = Number(parts[1]);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;

  const payload = `${parts[0]}.${parts[1]}.${parts[2]}`;
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  const provided = parts[3] ?? "";

  try {
    const a = Buffer.from(provided, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
