import { createHmac, randomBytes } from "node:crypto";
import { timingSafeEqual } from "@/lib/crypto-buffer";
import { mirotechSiteOrigin } from "@/lib/mirotech-site";

export { mirotechSiteOrigin };

const TOKEN_VERSION = "ho1";
const DEFAULT_TTL_SEC = 60;

function getHandoffSecret(): string | null {
  const secret =
    process.env.MIROTECH_ADMIN_HANDOFF_SECRET?.trim() ||
    process.env.ADMIN_HANDOFF_SECRET?.trim() ||
    "";
  if (!secret) return null;
  if (secret.length < 32) {
    console.error("MIROTECH_ADMIN_HANDOFF_SECRET must be at least 32 characters.");
    return null;
  }
  return secret;
}

export function isMirotechHandoffConfigured(): boolean {
  return Boolean(getHandoffSecret());
}

/** Only allow relative admin paths on Mirotech (no open redirect). */
export function sanitizeMirotechAdminPath(raw: string | null | undefined): string {
  const fallback = "/admin";
  if (!raw?.trim()) return fallback;
  let path = raw.trim();
  try {
    if (/^https?:\/\//i.test(path)) {
      const u = new URL(path);
      path = `${u.pathname}${u.search}`;
    }
  } catch {
    return fallback;
  }
  if (!path.startsWith("/")) path = `/${path}`;
  if (!path.startsWith("/admin")) return fallback;
  if (path.includes("\\") || path.includes("..")) return fallback;
  return path.slice(0, 200) || fallback;
}

export function createMirotechHandoffToken(nextPath: string, ttlSec = DEFAULT_TTL_SEC): string | null {
  const secret = getHandoffSecret();
  if (!secret) return null;
  const next = sanitizeMirotechAdminPath(nextPath);
  const exp = Math.floor(Date.now() / 1000) + Math.max(15, Math.min(ttlSec, 120));
  const nonce = randomBytes(16).toString("hex");
  const nextB64 = Buffer.from(next, "utf8").toString("base64url");
  const payload = `${TOKEN_VERSION}.${exp}.${nonce}.${nextB64}`;
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyMirotechHandoffToken(
  raw: string | null | undefined
): { ok: true; next: string } | { ok: false } {
  const token = raw?.trim();
  const secret = getHandoffSecret();
  if (!token || !secret) return { ok: false };

  const parts = token.split(".");
  if (parts.length !== 5 || parts[0] !== TOKEN_VERSION) return { ok: false };

  const exp = Number(parts[1]);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return { ok: false };

  const payload = `${parts[0]}.${parts[1]}.${parts[2]}.${parts[3]}`;
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  const provided = parts[4] ?? "";

  try {
    const a = Buffer.from(provided, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false };
  } catch {
    return { ok: false };
  }

  let next = "/admin";
  try {
    next = sanitizeMirotechAdminPath(Buffer.from(parts[3]!, "base64url").toString("utf8"));
  } catch {
    return { ok: false };
  }
  return { ok: true, next };
}
