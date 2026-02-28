/**
 * Pillar slugs — align with brightline/lib/portfolioPillars.ts
 * R2 keys and Sheet use these slugs: arc, cam, cor.
 *
 * T9 WEB_FULL folders may use full names (architecture, campaign, corporate).
 * T9_FOLDER_TO_PILLAR maps folder name → pillar slug for R2.
 */
export const PILLARS = ["arc", "cam", "cor"];

/** Map T9 folder names to pillar slugs (T9 may use architecture/campaign/corporate) */
export const T9_FOLDER_TO_PILLAR = {
  arc: "arc",
  cam: "cam",
  cor: "cor",
  architecture: "arc",
  campaign: "cam",
  corporate: "cor",
};
