export const STUDIO_HUB_CORE_FIELDS = [
  "subtitle",
  "categories",
  "disciplines",
  "tools",
  "challenge",
  "outcome",
  "projectDisclaimer",
  "role",
  "duration",
  "whatsNext",
] as const;

export type StudioHubCoreField = (typeof STUDIO_HUB_CORE_FIELDS)[number];

/** Match camelCase core field keys case-insensitively. */
export function normalizeCoreFieldKey(raw: string): StudioHubCoreField | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if ((STUDIO_HUB_CORE_FIELDS as readonly string[]).includes(trimmed)) {
    return trimmed as StudioHubCoreField;
  }
  const lower = trimmed.toLowerCase();
  const match = STUDIO_HUB_CORE_FIELDS.find((field) => field.toLowerCase() === lower);
  return match ?? null;
}
