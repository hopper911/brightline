import type { ProjectStatus } from "@prisma/client";

/** Canonical pipeline order for Mission Control UI (maps to DB `ProjectStatus`). */
export const STUDIO_PROJECT_PIPELINE: ProjectStatus[] = [
  "INQUIRY",
  "PLANNED",
  "SCHEDULED",
  "SHOT",
  "INGESTING",
  "EDITING",
  "PROOF_READY",
  "CLIENT_REVIEWING",
  "FINAL_APPROVED",
  "DELIVERED",
  "CASE_STUDY_DRAFT",
  "PUBLISHED",
  "ARCHIVED",
];

const LABELS: Record<ProjectStatus, string> = {
  INQUIRY: "Lead",
  PLANNED: "Planning",
  SCHEDULED: "Scheduled",
  SHOT: "Shooting",
  INGESTING: "Culling",
  EDITING: "Editing",
  PROOF_READY: "Proof ready",
  CLIENT_REVIEWING: "Review",
  FINAL_APPROVED: "Approved",
  DELIVERED: "Delivered",
  CASE_STUDY_DRAFT: "Case study",
  PUBLISHED: "Published",
  ARCHIVED: "Archived",
};

export function projectStatusLabel(status: ProjectStatus): string {
  return LABELS[status] ?? status;
}
