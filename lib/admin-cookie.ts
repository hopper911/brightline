import { getAdminSigningKey } from "@/lib/admin-config";

const COOKIE_VERSION = "v1";

function getSigningKey() {
  const key = getAdminSigningKey();
  if (!key) return null;
  return key;
}

async function signValue(value: string, key: string) {
  const subtle = crypto.subtle;
  const cryptoKey = await subtle.importKey(
    "raw",
    new TextEncoder().encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(value));
  const bytes = new Uint8Array(sig);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function createAdminCookieValue() {
  const key = getSigningKey();
  if (!key) return null;
  const payload = `${COOKIE_VERSION}.admin`;
  const signature = await signValue(payload, key);
  return `${payload}.${signature}`;
}

export async function verifyAdminCookieValue(cookieValue?: string | null) {
  if (!cookieValue) return false;
  const key = getSigningKey();
  if (!key) return false;

  const parts = cookieValue.split(".");
  if (parts.length !== 3) return false;

  const [version, marker, providedSig] = parts;
  if (version !== COOKIE_VERSION || marker !== "admin") return false;

  const payload = `${version}.${marker}`;
  const expectedSig = await signValue(payload, key);
  return expectedSig === providedSig;
}
