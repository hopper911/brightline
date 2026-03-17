/**
 * Project constants – safe to import from client components.
 */

export const PROJECT_STATUSES = [
  "lead",
  "quoted",
  "booked",
  "planned",
  "shot_complete",
  "editing_in_progress",
  "ready_for_delivery",
  "delivered",
  "pre_production",
  "shoot",
  "editing",
  "review",
  "delivery",
  "complete",
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];
