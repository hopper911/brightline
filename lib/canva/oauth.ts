import crypto from "crypto";
import { prisma } from "@/lib/prisma";

const TOKEN_SETTING_KEY = "canva_oauth:v1";
const PENDING_SETTING_KEY = "canva_oauth_pending:v1";

const CANVA_AUTH_BASE = "https://www.canva.com/api";
const CANVA_API_BASE = "https://api.canva.com/rest";

export const CANVA_SCOPES = [
  "design:content:read",
  "design:content:write",
  "design:meta:read",
  "asset:read",
  "asset:write",
  "profile:read",
].join(" ");

export type CanvaTokenBundle = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scope: string;
  connectedAt: string;
};

export type CanvaPendingAuth = {
  state: string;
  codeVerifier: string;
  createdAt: number;
};

export function isCanvaConfigured(): boolean {
  return Boolean(process.env.CANVA_CLIENT_ID?.trim() && process.env.CANVA_CLIENT_SECRET?.trim());
}

export function getCanvaRedirectUri(origin?: string): string {
  const fromEnv = process.env.CANVA_REDIRECT_URI?.trim();
  if (fromEnv) return fromEnv;
  if (origin) {
    return `${origin.replace(/\/$/, "")}/api/admin/canva/oauth/callback`;
  }
  return "http://127.0.0.1:3000/api/admin/canva/oauth/callback";
}

function getClientCredentials(): { clientId: string; clientSecret: string } {
  const clientId = process.env.CANVA_CLIENT_ID?.trim() || "";
  const clientSecret = process.env.CANVA_CLIENT_SECRET?.trim() || "";
  if (!clientId || !clientSecret) {
    throw Object.assign(new Error("Canva is not configured. Add CANVA_CLIENT_ID and CANVA_CLIENT_SECRET."), {
      status: 503,
    });
  }
  return { clientId, clientSecret };
}

function basicAuthHeader(clientId: string, clientSecret: string) {
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
}

export function createPkcePair() {
  const codeVerifier = crypto.randomBytes(64).toString("base64url");
  const codeChallenge = crypto.createHash("sha256").update(codeVerifier).digest("base64url");
  const state = crypto.randomBytes(32).toString("base64url");
  return { codeVerifier, codeChallenge, state };
}

export async function savePendingAuth(pending: CanvaPendingAuth): Promise<void> {
  await prisma.siteSetting.upsert({
    where: { key: PENDING_SETTING_KEY },
    update: { value: JSON.stringify(pending) },
    create: { key: PENDING_SETTING_KEY, value: JSON.stringify(pending) },
  });
}

export async function consumePendingAuth(state: string): Promise<CanvaPendingAuth | null> {
  const setting = await prisma.siteSetting.findUnique({
    where: { key: PENDING_SETTING_KEY },
    select: { value: true },
  });
  if (!setting?.value) return null;
  try {
    const pending = JSON.parse(setting.value) as CanvaPendingAuth;
    await prisma.siteSetting.delete({ where: { key: PENDING_SETTING_KEY } }).catch(() => undefined);
    if (!pending?.state || pending.state !== state) return null;
    // Expire after 15 minutes
    if (Date.now() - (pending.createdAt || 0) > 15 * 60_000) return null;
    return pending;
  } catch {
    return null;
  }
}

export async function getStoredTokens(): Promise<CanvaTokenBundle | null> {
  try {
    const setting = await prisma.siteSetting.findUnique({
      where: { key: TOKEN_SETTING_KEY },
      select: { value: true },
    });
    if (!setting?.value) return null;
    const parsed = JSON.parse(setting.value) as CanvaTokenBundle;
    if (!parsed?.accessToken || !parsed?.refreshToken) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function saveTokens(bundle: CanvaTokenBundle): Promise<void> {
  await prisma.siteSetting.upsert({
    where: { key: TOKEN_SETTING_KEY },
    update: { value: JSON.stringify(bundle) },
    create: { key: TOKEN_SETTING_KEY, value: JSON.stringify(bundle) },
  });
}

export async function clearTokens(): Promise<void> {
  await prisma.siteSetting.delete({ where: { key: TOKEN_SETTING_KEY } }).catch(() => undefined);
  await prisma.siteSetting.delete({ where: { key: PENDING_SETTING_KEY } }).catch(() => undefined);
}

export async function isCanvaConnected(): Promise<boolean> {
  const tokens = await getStoredTokens();
  return Boolean(tokens?.refreshToken);
}

export function buildAuthorizeUrl(options: {
  codeChallenge: string;
  state: string;
  redirectUri: string;
}): string {
  const { clientId } = getClientCredentials();
  const params = new URLSearchParams({
    code_challenge: options.codeChallenge,
    code_challenge_method: "s256",
    scope: CANVA_SCOPES,
    response_type: "code",
    client_id: clientId,
    state: options.state,
    redirect_uri: options.redirectUri,
  });
  return `${CANVA_AUTH_BASE}/oauth/authorize?${params.toString()}`;
}

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
};

async function exchangeToken(body: URLSearchParams): Promise<CanvaTokenBundle> {
  const { clientId, clientSecret } = getClientCredentials();
  const res = await fetch(`${CANVA_API_BASE}/v1/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(clientId, clientSecret),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const json = (await res.json().catch(() => ({}))) as TokenResponse & {
    message?: string;
    error?: string;
  };
  if (!res.ok || !json.access_token || !json.refresh_token) {
    const message = json.message || json.error || `Canva token exchange failed (${res.status})`;
    throw Object.assign(new Error(message), { status: res.status >= 400 ? res.status : 502 });
  }
  const expiresIn = typeof json.expires_in === "number" ? json.expires_in : 3600;
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt: Date.now() + Math.max(60, expiresIn - 60) * 1000,
    scope: typeof json.scope === "string" ? json.scope : CANVA_SCOPES,
    connectedAt: new Date().toISOString(),
  };
}

export async function exchangeAuthorizationCode(options: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}): Promise<CanvaTokenBundle> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: options.code,
    code_verifier: options.codeVerifier,
    redirect_uri: options.redirectUri,
  });
  return exchangeToken(body);
}

export async function refreshAccessToken(refreshToken: string): Promise<CanvaTokenBundle> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  return exchangeToken(body);
}

/** Return a valid access token, refreshing if needed. */
export async function getValidAccessToken(): Promise<string> {
  const stored = await getStoredTokens();
  if (!stored?.refreshToken) {
    throw Object.assign(new Error("Canva is not connected. Connect Canva in Admin → Blog."), {
      status: 401,
    });
  }
  if (stored.accessToken && stored.expiresAt > Date.now()) {
    return stored.accessToken;
  }
  const next = await refreshAccessToken(stored.refreshToken);
  next.connectedAt = stored.connectedAt || next.connectedAt;
  await saveTokens(next);
  return next.accessToken;
}
