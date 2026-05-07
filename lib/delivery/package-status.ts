/** Normalized package lifecycle (lowercase). Legacy values preserved for existing rows. */
export const PACKAGE_STATUSES = [
  "draft",
  "preparing",
  "prepared",
  "ready_for_review",
  "sent",
  "viewed",
  "delivered",
  "approved",
  "archived",
] as const;

export type PackageStatus = (typeof PACKAGE_STATUSES)[number];
