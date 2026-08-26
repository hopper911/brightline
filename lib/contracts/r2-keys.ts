import { randomBytes } from "crypto";

/** URL-safe opaque token for client-facing document/form links. */
export function generateClientToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Slug segment for R2 keys (alphanumeric + hyphen). */
export function sanitizePathSegment(raw: string, fallback: string): string {
  const base = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base || fallback;
}

export type ContractPdfKind = "draft" | "signed";

export function contractPdfKey(input: {
  year: number;
  clientSlug: string;
  projectSlug: string;
  kind: ContractPdfKind;
  documentId: string;
}): string {
  const y = input.year;
  const c = sanitizePathSegment(input.clientSlug, "client");
  const p = sanitizePathSegment(input.projectSlug, "project");
  const shortId = input.documentId.replace(/[^a-z0-9]/gi, "").slice(0, 12) || "doc";
  return `legal/contracts/${y}/${c}/${p}/${input.kind}-${shortId}.pdf`;
}
