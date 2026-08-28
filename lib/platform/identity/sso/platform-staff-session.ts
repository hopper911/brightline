import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const PLATFORM_STAFF_SESSION_COOKIE = "platform_staff_session";
export const PLATFORM_SSO_STATE_COOKIE = "platform_sso_state";
export const PLATFORM_STAFF_SESSION_MAX_AGE_SEC = 8 * 60 * 60;

const SESSION_VERSION = "ps1";

function getStaffSessionSecret(): string | null {
  const secret = process.env.PLATFORM_SSO_EXCHANGE_SECRET?.trim() || "";
  if (!secret || secret.length < 32) return null;
  return secret;
}

export function createPlatformStaffSessionToken(userId: string): string | null {
  const secret = getStaffSessionSecret();
  if (!secret) return null;
  const exp = Math.floor(Date.now() / 1000) + PLATFORM_STAFF_SESSION_MAX_AGE_SEC;
  const nonce = randomBytes(8).toString("hex");
  const payload = `${SESSION_VERSION}.${exp}.${userId}.${nonce}`;
  const sig = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyPlatformStaffSessionToken(
  raw: string | null | undefined
): { ok: true; userId: string } | { ok: false } {
  const token = raw?.trim();
  const secret = getStaffSessionSecret();
  if (!token || !secret) return { ok: false };

  const parts = token.split(".");
  if (parts.length !== 5 || parts[0] !== SESSION_VERSION) return { ok: false };

  const exp = Number(parts[1]);
  const userId = parts[2] ?? "";
  if (!userId || !Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) {
    return { ok: false };
  }

  const payload = parts.slice(0, 4).join(".");
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  const provided = parts[4] ?? "";

  try {
    const a = Buffer.from(provided, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false };
  } catch {
    return { ok: false };
  }

  return { ok: true, userId };
}

export function readPlatformStaffUserIdFromRequest(req: Request): string | null {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${PLATFORM_STAFF_SESSION_COOKIE}=([^;]+)`)
  );
  const raw = match?.[1] ? decodeURIComponent(match[1]) : null;
  const verified = verifyPlatformStaffSessionToken(raw);
  return verified.ok ? verified.userId : null;
}

export function readSsoStateFromRequest(req: Request): string | null {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${PLATFORM_SSO_STATE_COOKIE}=([^;]+)`));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export function createSsoStateToken(): string {
  return randomBytes(24).toString("base64url");
}
