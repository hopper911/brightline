import type { ProjectWorkflowLifecycle } from "@/lib/platform/projects/types";
import type { StudioProjectStatusFilter } from "@/lib/studio/projects/types";

export const STUDIO_PROJECT_STATUS_LABELS: Record<
  Exclude<StudioProjectStatusFilter, "all">,
  string
> = {
  draft: "Draft",
  "needs-content": "Needs content",
  "needs-media": "Needs media",
  review: "Review",
  approved: "Approved",
  published: "Published",
};

export function lifecycleDisplayLabel(lifecycle: ProjectWorkflowLifecycle): string {
  switch (lifecycle) {
    case "DRAFT":
      return "Draft";
    case "CONTENT_READY":
      return "Needs media";
    case "MEDIA_READY":
      return "Media ready";
    case "IN_REVIEW":
      return "In review";
    case "APPROVED":
      return "Approved";
    case "PUBLISHED":
      return "Published";
    case "ARCHIVED":
      return "Archived";
    default:
      return lifecycle;
  }
}

/** Map lifecycle to the dashboard filter bucket used for filtering. */
export function lifecycleToStatusBucket(lifecycle: ProjectWorkflowLifecycle): Exclude<
  StudioProjectStatusFilter,
  "all"
> {
  switch (lifecycle) {
    case "DRAFT":
      return "draft";
    case "CONTENT_READY":
      return "needs-media";
    case "MEDIA_READY":
      return "needs-media";
    case "IN_REVIEW":
      return "review";
    case "APPROVED":
      return "approved";
    case "PUBLISHED":
      return "published";
    case "ARCHIVED":
      return "draft";
    default:
      return "draft";
  }
}

export function matchesStudioProjectStatusFilter(
  lifecycle: ProjectWorkflowLifecycle,
  filter: StudioProjectStatusFilter
): boolean {
  if (filter === "all") return lifecycle !== "ARCHIVED";
  if (filter === "needs-content") {
    return lifecycle === "DRAFT";
  }
  if (filter === "needs-media") {
    return lifecycle === "CONTENT_READY";
  }
  return lifecycleToStatusBucket(lifecycle) === filter;
}

export function studioProjectEmptyMessage(
  statusFilter: StudioProjectStatusFilter,
  tenantFilter: "brightline" | "mirotech" | "all"
): string {
  const tenantLabel =
    tenantFilter === "all"
      ? "projects match these filters"
      : tenantFilter === "brightline"
        ? "Brightline projects match these filters"
        : "MiroTech projects match these filters";

  if (statusFilter === "all") {
    return tenantFilter === "all"
      ? "No workflow projects yet. Create a draft to start ingestion."
      : `No ${tenantFilter === "brightline" ? "Brightline" : "MiroTech"} workflow projects yet.`;
  }

  const statusLabel = STUDIO_PROJECT_STATUS_LABELS[statusFilter];
  return `No ${tenantLabel} with status “${statusLabel}”.`;
}
