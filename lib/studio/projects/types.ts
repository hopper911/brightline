import type { ProjectWorkflowKind, ProjectWorkflowLifecycle } from "@/lib/platform/projects/types";
import type { TenantSlug } from "@/lib/platform/tenants/types";

/** Dashboard status filters — map to normalized lifecycle buckets. */
export const STUDIO_PROJECT_STATUS_FILTERS = [
  "all",
  "draft",
  "needs-content",
  "needs-media",
  "review",
  "approved",
  "published",
] as const;

export type StudioProjectStatusFilter = (typeof STUDIO_PROJECT_STATUS_FILTERS)[number];

export type StudioProjectDashboardRow = {
  id: string;
  tenant: TenantSlug;
  kind: ProjectWorkflowKind;
  title: string;
  slug: string;
  typeLabel: string;
  lifecycle: ProjectWorkflowLifecycle;
  lifecycleLabel: string;
  completenessScore: number;
  completenessComplete: boolean;
  missing: string[];
  published: boolean;
  updatedAt: string;
  editHref: string;
  verificationStatus: "verified" | "warning" | "failed" | "unchecked";
  verificationLabel: string;
  verificationReason: string | null;
  publicPath: string | null;
};

export type StudioProjectsListResult = {
  items: StudioProjectDashboardRow[];
  total: number;
  page: number;
  pageSize: number;
  tenantFilter: TenantSlug | "all";
  statusFilter: StudioProjectStatusFilter;
  emptyMessage: string;
  canCreateBrightline: boolean;
  canCreateMirotech: boolean;
};
