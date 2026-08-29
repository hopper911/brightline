import type { ProjectWorkflowLifecycle } from "@/lib/platform/projects/types";

const LIFECYCLE_ORDER: ProjectWorkflowLifecycle[] = [
  "DRAFT",
  "CONTENT_READY",
  "MEDIA_READY",
  "IN_REVIEW",
  "APPROVED",
  "PUBLISHED",
  "ARCHIVED",
];

const ORDER_INDEX = new Map(LIFECYCLE_ORDER.map((s, i) => [s, i]));

/** Legal explicit transitions (including useful backward moves). */
const ALLOWED_TRANSITIONS: Record<ProjectWorkflowLifecycle, ProjectWorkflowLifecycle[]> = {
  DRAFT: ["CONTENT_READY", "MEDIA_READY", "IN_REVIEW"],
  CONTENT_READY: ["DRAFT", "MEDIA_READY", "IN_REVIEW"],
  MEDIA_READY: ["CONTENT_READY", "IN_REVIEW"],
  IN_REVIEW: ["MEDIA_READY", "APPROVED"],
  APPROVED: ["IN_REVIEW", "PUBLISHED"],
  PUBLISHED: ["APPROVED", "ARCHIVED"],
  ARCHIVED: ["DRAFT"],
};

export function lifecycleOrderIndex(lifecycle: ProjectWorkflowLifecycle): number {
  return ORDER_INDEX.get(lifecycle) ?? 0;
}

export function canTransitionLifecycle(
  from: ProjectWorkflowLifecycle,
  to: ProjectWorkflowLifecycle
): boolean {
  if (from === to) return true;
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function allowedNextLifecycles(from: ProjectWorkflowLifecycle): ProjectWorkflowLifecycle[] {
  return ALLOWED_TRANSITIONS[from] ?? [];
}

export function requiresCompletenessForReview(to: ProjectWorkflowLifecycle): boolean {
  return to === "IN_REVIEW";
}

export function requiresApprovalPermission(to: ProjectWorkflowLifecycle): boolean {
  return to === "APPROVED" || to === "PUBLISHED";
}

export function isReopenReview(from: ProjectWorkflowLifecycle, to: ProjectWorkflowLifecycle): boolean {
  return from === "APPROVED" && to === "IN_REVIEW";
}

export function resolveEffectiveLifecycle(
  stored: ProjectWorkflowLifecycle | null,
  derived: ProjectWorkflowLifecycle,
  published: boolean
): ProjectWorkflowLifecycle {
  if (published) return "PUBLISHED";

  const derivedIndex = lifecycleOrderIndex(derived);
  const storedIndex = stored ? lifecycleOrderIndex(stored) : derivedIndex;
  const reviewIndex = lifecycleOrderIndex("IN_REVIEW");

  if (stored && storedIndex >= reviewIndex) {
    return stored;
  }

  if (derivedIndex >= reviewIndex) {
    return derived;
  }

  return stored ? LIFECYCLE_ORDER[Math.max(derivedIndex, storedIndex)] : derived;
}
