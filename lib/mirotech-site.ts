/**
 * Mirotech site URL helpers — safe for client bundles (no node:crypto).
 */

export function mirotechSiteOrigin(): string {
  return (
    process.env.MIROTECH_SITE_URL?.trim().replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_MIROTECH_SITE_URL?.trim().replace(/\/$/, "") ||
    "https://mirotech.solutions"
  );
}
