import type { ContentRef } from "@/lib/platform/content/types";
import type { TenantSlug } from "@/lib/platform/tenants/types";

/** Workflow kinds supported in Phase 22A (not every ContentType). */
export const PROJECT_WORKFLOW_KINDS = ["work-project", "mirotech-case-study"] as const;

export type ProjectWorkflowKind = (typeof PROJECT_WORKFLOW_KINDS)[number];

export function isProjectWorkflowKind(value: unknown): value is ProjectWorkflowKind {
  return typeof value === "string" && (PROJECT_WORKFLOW_KINDS as readonly string[]).includes(value);
}

/**
 * Normalized ingestion lifecycle — maps from domain-specific status fields.
 * Not stored as a single Prisma enum across tenants.
 */
export const PROJECT_WORKFLOW_LIFECYCLE = [
  "DRAFT",
  "CONTENT_READY",
  "MEDIA_READY",
  "IN_REVIEW",
  "APPROVED",
  "PUBLISHED",
  "ARCHIVED",
] as const;

export type ProjectWorkflowLifecycle = (typeof PROJECT_WORKFLOW_LIFECYCLE)[number];

export type ProjectCompletenessResult = {
  complete: boolean;
  /** Transparent ratio of passed required checks (0–100). Not an AI score. */
  score: number;
  missing: string[];
  warnings: string[];
};

export type ProjectSlugConflictPolicy = "reject" | "suffix";

export type ProjectWorkflowCreateInput = {
  tenant: TenantSlug;
  kind: ProjectWorkflowKind;
  title: string;
  slug?: string;
  templateId?: string;
  /** Brightline work pillar slug (e.g. acd, rea). */
  pillarSlug?: string;
  /** Brightline WorkSection when pillar is omitted. */
  section?: string;
  summary?: string;
  /** When slug collides — Brightline defaults to reject; Mirotech hub may suffix. */
  slugConflictPolicy?: ProjectSlugConflictPolicy;
};

export type ProjectWorkflowCreateResult = {
  ref: ContentRef;
  id: string;
  slug: string;
  lifecycle: ProjectWorkflowLifecycle;
  completeness: ProjectCompletenessResult;
};

export type ProjectWorkflowStatusChangeInput = {
  tenant: TenantSlug;
  ref: ContentRef;
  fromLifecycle: ProjectWorkflowLifecycle;
  toLifecycle: ProjectWorkflowLifecycle;
  reason?: string;
};

export type ProjectWorkflowTransitionInput = {
  tenant: TenantSlug;
  ref: ContentRef;
  toLifecycle: ProjectWorkflowLifecycle;
  reviewNotes?: string;
};

export type ProjectWorkflowTransitionResult = {
  lifecycle: ProjectWorkflowLifecycle;
  completeness: ProjectCompletenessResult;
  reviewNotes: string | null;
  allowedTransitions: ProjectWorkflowLifecycle[];
  missing?: string[];
};
