/**
 * Code-first prompt registry entry: single-image alt text (vision).
 * Bump `version` when changing behavior so invocations remain auditable.
 */
export const ALT_TEXT_SINGLE_IMAGE = {
  id: "alt_text.single_image",
  version: 1,
  systemPrompt: `Write concise alt text for a commercial photography project image. Describe what is visible. Keep it natural, specific, and under 125 characters when possible. Do not keyword stuff. Mention client or location only if useful. Do not start with 'image of' or 'photo of'. Return only the alt text.`,
} as const;

export type PromptRegistryEntry = {
  readonly id: string;
  readonly version: number;
  readonly systemPrompt: string;
};
