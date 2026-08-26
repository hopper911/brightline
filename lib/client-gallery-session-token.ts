import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/** Signed client gallery session — binds cookie to access-token id without exposing a bare cuid. */
export const CLIENT_GALLERY_SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7;
const COOKIE_VERSION = "v1";

function getSigningSecret(): string | null {
  const dedicated = process.env.CLIENT_GALLERY_SESSION_SECRET?.trim();
  if (dedicated) return dedicated;

  const admin = process.env.ADMIN_SESSION_SECRET?.trim();
  if (admin) {
    return createHmac("sha256", "brightline-client-gallery-session-v1")
      .update(admin)
      .digest("hex");
  }

  const accessCode = process.env.ADMIN_ACCESS_CODE?.trim();
  if (!accessCode) return null;
  return createHmac("sha256", "brightline-client-gallery-session-v1")
    .update(accessCode)
    .digest("hex");
}

export function createClientGallerySessionToken(accessTokenId: string): string | null {
  const secret = getSigningSecret();
  const id = accessTokenId.trim();
  if (!secret || !id) return null;

  const exp = Math.floor(Date.now() / 1000) + CLIENT_GALLERY_SESSION_MAX_AGE_SEC;
  const nonce = randomBytes(12).toString("hex");
  const payload = `${COOKIE_VERSION}.${exp}.${id}.${nonce}`;
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyClientGallerySessionToken(
  raw: string | null | undefined
): { ok: true; accessTokenId: string } | { ok: false } {
  const token = raw?.trim();
  if (!token) return { ok: false };

  const secret = getSigningSecret();
  if (!secret) return { ok: false };

  const parts = token.split(".");
  if (parts.length !== 5 || parts[0] !== COOKIE_VERSION) return { ok: false };

  const exp = Number(parts[1]);
  const accessTokenId = parts[2] ?? "";
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000) || !accessTokenId) {
    return { ok: false };
  }

  const payload = `${parts[0]}.${parts[1]}.${parts[2]}.${parts[3]}`;
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  const provided = parts[4] ?? "";

  try {
    const a = Buffer.from(provided, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false };
    return { ok: true, accessTokenId };
  } catch {
    return { ok: false };
  }
}
