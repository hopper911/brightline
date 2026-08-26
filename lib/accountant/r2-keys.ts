import { randomUUID } from "node:crypto";

const RECEIPTS_PREFIX = "accounting/receipts/";
const DOCUMENTS_PREFIX = "accounting/documents/";

export function isAccountingPrivateKey(key: string): boolean {
  const k = key.replace(/^\//, "");
  return k.startsWith(RECEIPTS_PREFIX) || k.startsWith(DOCUMENTS_PREFIX);
}

export function buildReceiptUploadKey(originalName: string): { key: string; safeName: string } {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const safe = originalName.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 96) || "file";
  const key = `${RECEIPTS_PREFIX}${y}/${m}/${randomUUID()}-${safe}`;
  return { key, safeName: safe };
}

export function buildDocumentKey(filename: string): { key: string } {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const safe = filename.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 96) || "report";
  return { key: `${DOCUMENTS_PREFIX}${y}/${m}/${randomUUID()}-${safe}` };
}
