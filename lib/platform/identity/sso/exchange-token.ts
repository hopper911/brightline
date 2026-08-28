import { createHmac, randomBytes } from "node:crypto";
import { timingSafeEqual } from "@/lib/crypto-buffer";
import {
  SSO_EXCHANGE_TTL_MAX_SEC,
  SSO_EXCHANGE_TTL_MIN_SEC,
  SSO_TOKEN_VERSION,
  type SsoExchangeClaims,
  type SsoExchangeStartInput,
} from "@/lib/platform/identity/sso/types";
import type { TenantSlug } from "@/lib/platform/tenants/types";

function getSsoExchangeSecret(): string | null {
  const secret = process.env.PLATFORM_SSO_EXCHANGE_SECRET?.trim() || "";
  if (!secret || secret.length < 32) return null;
  return secret;
}

function isTenantSlug(value: string): value is TenantSlug {
  return value === "brightline" || value === "mirotech";
}

export function createSsoExchangeToken(input: SsoExchangeStartInput): string | null {
  const secret = getSsoExchangeSecret();
  if (!secret) return null;

  const ttl = Math.max(
    SSO_EXCHANGE_TTL_MIN_SEC,
    Math.min(input.ttlSec ?? 90, SSO_EXCHANGE_TTL_MAX_SEC)
  );
  const exp = Math.floor(Date.now() / 1000) + ttl;
  const nonce = randomBytes(16).toString("hex");
  const stateB64 = Buffer.from(input.state, "utf8").toString("base64url");
  const returnB64 = Buffer.from(input.returnTo, "utf8").toString("base64url");
  const payload = [
    SSO_TOKEN_VERSION,
    input.issuer,
    input.audience,
    String(exp),
    nonce,
    input.userId,
    stateB64,
    returnB64,
  ].join(".");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifySsoExchangeToken(
  raw: string | null | undefined
): { ok: true; claims: SsoExchangeClaims } | { ok: false } {
  const token = raw?.trim();
  const secret = getSsoExchangeSecret();
  if (!token || !secret) return { ok: false };

  const parts = token.split(".");
  if (parts.length !== 9 || parts[0] !== SSO_TOKEN_VERSION) return { ok: false };

  const issuer = parts[1] ?? "";
  const audience = parts[2] ?? "";
  if (!isTenantSlug(issuer) || !isTenantSlug(audience)) return { ok: false };

  const exp = Number(parts[3]);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return { ok: false };

  const nonce = parts[4] ?? "";
  const userId = parts[5] ?? "";
  if (!nonce || !userId) return { ok: false };

  const payload = parts.slice(0, 8).join(".");
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  const provided = parts[8] ?? "";

  try {
    const a = Buffer.from(provided, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false };
  } catch {
    return { ok: false };
  }

  let state = "";
  let returnTo = "/admin";
  try {
    state = Buffer.from(parts[6]!, "base64url").toString("utf8");
    returnTo = Buffer.from(parts[7]!, "base64url").toString("utf8");
  } catch {
    return { ok: false };
  }

  return {
    ok: true,
    claims: {
      version: SSO_TOKEN_VERSION,
      issuer,
      audience,
      exp,
      nonce,
      userId,
      state,
      returnTo,
    },
  };
}
