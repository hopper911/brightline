/**
 * Lightweight runtime checks for automation payloads (zod is not a project dependency).
 * Authoritative validation still happens in `lib/studio/studio-project-cms.ts` on write.
 */

export function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

export function parseYearField(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
  if (typeof v === "string" && /^\d{4}$/.test(v.trim())) {
    return parseInt(v.trim(), 10);
  }
  return null;
}
