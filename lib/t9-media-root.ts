/**
 * T9 Image/Video Port destination roots in Brightline R2.
 * `portfolio/` = Brightline Photography; `mirotech/` = dual-brand sibling vault.
 */
export const T9_MEDIA_ROOTS = ["portfolio", "mirotech"] as const;
export type T9MediaRoot = (typeof T9_MEDIA_ROOTS)[number];

export function isT9MediaRoot(value: unknown): value is T9MediaRoot {
  return typeof value === "string" && (T9_MEDIA_ROOTS as readonly string[]).includes(value);
}

/** Invalid / missing → Brightline portfolio (safe default). */
export function normalizeT9MediaRoot(value: unknown): T9MediaRoot {
  return isT9MediaRoot(value) ? value : "portfolio";
}
